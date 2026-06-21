import {
  EBAY_BRAND,
  EBAY_DEFAULT_QUERY,
  EBAY_PAGE_SIZE,
  EBAY_SEARCH_LIMIT,
  EBAY_WRISTWATCH_CATEGORY_ID,
  ebaySearchResponseSchema,
  type EbayItemSummary,
} from "./schema";
import {
  ebaySnapshotAgeMinutes,
  readEbaySnapshot,
  writeEbaySnapshot,
} from "./snapshot";

const REVALIDATE_SECONDS = 3600;
/** In-process cache — avoids duplicate fetches during dev hot reload. */
const MEMORY_TTL_MS = 6 * 60 * 60 * 1000;
const STRICT_MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Pause between paginated Browse API requests during sync (production). */
const DEFAULT_PAGE_DELAY_MS = 500;
/** Retries for 429/503 with exponential backoff (respects Retry-After when present). */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 2000;
/** Local dev / non-production: stay well under eBay Browse API quotas. */
const STRICT_PAGE_DELAY_MS = 10_000;
const STRICT_MIN_REQUEST_GAP_MS = 8_000;
const STRICT_MAX_RETRIES = 1;
const STRICT_RETRY_BASE_MS = 60_000;
/** Tiny sample on dev page loads (even with EBAY_FORCE_REFRESH=1). */
const STRICT_LIVE_FETCH_LIMIT = 25;
/** One small page for manual sync in dev unless EBAY_SEARCH_LIMIT is set. */
const STRICT_SYNC_LIMIT = 50;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
let memoryCache: { listings: EbayItemSummary[]; fetchedAt: number } | null = null;
let inFlightFetch: Promise<EbayItemSummary[]> | null = null;
let lastEbayApiRequestAt = 0;

function getEbayConfig() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const marketplaceId = process.env.EBAY_MARKETPLACE_ID ?? "EBAY_CA";
  const env = process.env.EBAY_ENV ?? "production";

  if (!clientId || !clientSecret) {
    return null;
  }

  const baseUrl =
    env === "sandbox"
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

  return { clientId, clientSecret, marketplaceId, baseUrl };
}

function forceRefreshRequested(): boolean {
  return process.env.EBAY_FORCE_REFRESH === "1";
}

function isManualSyncRun(): boolean {
  return process.env.EBAY_SYNC === "1";
}

/** True for local dev, sync scripts, and preview — not production deploys. */
function useStrictEbayRateLimits(): boolean {
  const mode = process.env.EBAY_RATE_LIMIT_MODE?.trim().toLowerCase();
  if (mode === "strict") return true;
  if (mode === "production") return false;
  return process.env.NODE_ENV !== "production";
}

function resolvePageDelayMs(): number {
  const raw = process.env.EBAY_PAGE_DELAY_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return useStrictEbayRateLimits() ? STRICT_PAGE_DELAY_MS : DEFAULT_PAGE_DELAY_MS;
}

function resolveMaxRetries(): number {
  const raw = process.env.EBAY_MAX_RETRIES;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return useStrictEbayRateLimits() ? STRICT_MAX_RETRIES : DEFAULT_MAX_RETRIES;
}

function resolveRetryBaseMs(): number {
  const raw = process.env.EBAY_RETRY_BASE_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return useStrictEbayRateLimits() ? STRICT_RETRY_BASE_MS : DEFAULT_RETRY_BASE_MS;
}

function resolveMinRequestGapMs(): number {
  const raw = process.env.EBAY_MIN_REQUEST_GAP_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return useStrictEbayRateLimits() ? STRICT_MIN_REQUEST_GAP_MS : 0;
}

function resolveMemoryTtlMs(): number {
  return useStrictEbayRateLimits() ? STRICT_MEMORY_TTL_MS : MEMORY_TTL_MS;
}

function resolveSearchLimit(): number {
  const raw = process.env.EBAY_SEARCH_LIMIT;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return useStrictEbayRateLimits() ? STRICT_SYNC_LIMIT : EBAY_SEARCH_LIMIT;
}

/** Live page-load fetch: one page by default. Full pagination is for manual sync only. */
function resolveLiveFetchLimit(): number {
  const raw = process.env.EBAY_LIVE_FETCH_LIMIT;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), EBAY_PAGE_SIZE);
  }
  if (useStrictEbayRateLimits()) {
    return Math.min(STRICT_LIVE_FETCH_LIMIT, EBAY_PAGE_SIZE);
  }
  return EBAY_PAGE_SIZE;
}

function resolveFetchLimit(): number {
  if (!forceRefreshRequested()) return resolveLiveFetchLimit();
  return isManualSyncRun() ? resolveSearchLimit() : resolveLiveFetchLimit();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleEbayApiCall(): Promise<void> {
  const minGapMs = resolveMinRequestGapMs();
  if (minGapMs <= 0) return;

  const waitMs = lastEbayApiRequestAt + minGapMs - Date.now();
  if (waitMs > 0) {
    console.info(`eBay throttle: waiting ${waitMs}ms before next API call`);
    await sleep(waitMs);
  }
  lastEbayApiRequestAt = Date.now();
}

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("Retry-After");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function isRetryableEbayStatus(status: number): boolean {
  return status === 429 || status === 503;
}

async function getAccessToken(config: NonNullable<ReturnType<typeof getEbayConfig>>): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  await throttleEbayApiCall();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

async function fetchEbaySearchPageOnce(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  token: string,
  offset: number,
  limit: number
): Promise<Response> {
  const aspectFilter = `categoryId:${EBAY_WRISTWATCH_CATEGORY_ID},Brand:{${EBAY_BRAND}}`;
  const params = new URLSearchParams({
    q: EBAY_DEFAULT_QUERY,
    category_ids: EBAY_WRISTWATCH_CATEGORY_ID,
    aspect_filter: aspectFilter,
    limit: String(limit),
    offset: String(offset),
    sort: "newlyListed",
  });

  return fetch(`${config.baseUrl}/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": config.marketplaceId,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

async function fetchEbaySearchPage(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  token: string,
  offset: number,
  limit: number
): Promise<{ items: EbayItemSummary[]; rateLimited: boolean }> {
  const maxRetries = resolveMaxRetries();
  let attempt = 0;

  while (true) {
    await throttleEbayApiCall();
    const res = await fetchEbaySearchPageOnce(config, token, offset, limit);

    if (res.ok) {
      const json = await res.json();
      const parsed = ebaySearchResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("eBay response validation failed:", parsed.error.message);
        return { items: [], rateLimited: false };
      }
      return { items: parsed.data.itemSummaries ?? [], rateLimited: false };
    }

    if (isRetryableEbayStatus(res.status) && attempt < maxRetries) {
      const waitMs =
        retryAfterMs(res) ?? resolveRetryBaseMs() * 2 ** attempt;
      console.warn(
        `eBay search ${res.status} at offset ${offset}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`
      );
      await sleep(waitMs);
      attempt += 1;
      continue;
    }

    console.warn("eBay search failed:", res.status, "offset", offset);
    return { items: [], rateLimited: res.status === 429 };
  }
}

async function fetchEbayListingsFromApi(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  maxResults: number
): Promise<EbayItemSummary[]> {
  const token = await getAccessToken(config);
  const pageDelayMs = resolvePageDelayMs();
  const results: EbayItemSummary[] = [];
  let offset = 0;

  while (results.length < maxResults) {
    const pageSize = Math.min(EBAY_PAGE_SIZE, maxResults - results.length);
    const { items, rateLimited } = await fetchEbaySearchPage(config, token, offset, pageSize);
    if (items.length === 0) {
      if (rateLimited && results.length > 0) break;
      break;
    }
    results.push(...items);
    offset += items.length;
    if (items.length < pageSize) break;
    if (results.length < maxResults && pageDelayMs > 0) {
      await sleep(pageDelayMs);
    }
  }

  return results;
}

function useMemoryCache(): EbayItemSummary[] | null {
  if (!memoryCache) return null;
  if (Date.now() - memoryCache.fetchedAt > resolveMemoryTtlMs()) return null;
  return memoryCache.listings;
}

function cacheListings(listings: EbayItemSummary[]): EbayItemSummary[] {
  memoryCache = { listings, fetchedAt: Date.now() };
  if (listings.length > 0) writeEbaySnapshot(listings);
  return listings;
}

function useDiskCache(reason: string): EbayItemSummary[] {
  const cached = readEbaySnapshot();
  if (!cached || cached.length === 0) return [];
  const age = ebaySnapshotAgeMinutes();
  console.warn(
    `Using cached eBay listings (${cached.length}) — ${reason}` +
      (age != null ? ` (cache ${age}m old)` : "")
  );
  memoryCache = { listings: cached, fetchedAt: Date.now() };
  return cached;
}

async function fetchEbayListingsInternal(): Promise<EbayItemSummary[]> {
  const config = getEbayConfig();
  if (!config) {
    return [];
  }

  const fromMemory = useMemoryCache();
  if (fromMemory) {
    return fromMemory;
  }

  const diskCached = readEbaySnapshot();
  const hasDiskCache = (diskCached?.length ?? 0) > 0;

  // Normal page loads: serve snapshot only — never hit Browse API without cache.
  if (!forceRefreshRequested()) {
    if (hasDiskCache) {
      return useDiskCache("snapshot preferred over live fetch");
    }
    return [];
  }

  const fetchLimit = resolveFetchLimit();
  const pageDelayMs = resolvePageDelayMs();
  const minGapMs = resolveMinRequestGapMs();

  if (forceRefreshRequested() && useStrictEbayRateLimits()) {
    console.warn(
      "eBay strict dev limits active — prefer disk snapshot; live calls are capped heavily."
    );
    console.info(
      `eBay strict rate limits: max ${fetchLimit} listings, ${pageDelayMs}ms between pages, ${minGapMs}ms min gap between API calls` +
        (isManualSyncRun() ? " (sync)" : " (live fetch)")
    );
  }

  try {
    const fresh = await fetchEbayListingsFromApi(config, fetchLimit);
    if (fresh.length > 0) {
      return cacheListings(fresh);
    }
  } catch (err) {
    console.warn("eBay fetch error:", err);
  }

  if (hasDiskCache) {
    return useDiskCache("API returned no results");
  }

  return [];
}

export async function fetchEbayListings(): Promise<EbayItemSummary[]> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = fetchEbayListingsInternal().finally(() => {
    inFlightFetch = null;
  });

  return inFlightFetch;
}

export function hasEbayCredentials(): boolean {
  const id = process.env.EBAY_CLIENT_ID?.trim();
  const secret = process.env.EBAY_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

function extractEbayNumericId(url: string): string | null {
  const match = url.match(/\/itm\/(\d+)/i);
  return match?.[1] ?? null;
}

/** Fetch a single listing photo from the Browse API when the item is not in the feed snapshot. */
export async function fetchEbayImageForUrl(purchaseUrl: string): Promise<string | null> {
  const metadata = await fetchEbayListingMetadata(purchaseUrl);
  return metadata.imageUrl;
}

export interface EbayListingMetadata {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
}

/** Fetch listing photo + text from the Browse API when the item is not in the feed snapshot. */
export async function fetchEbayListingMetadata(
  purchaseUrl: string
): Promise<EbayListingMetadata> {
  const numericId = extractEbayNumericId(purchaseUrl);
  if (!numericId) {
    return { imageUrl: null, title: null, description: null };
  }

  const config = getEbayConfig();
  if (!config) {
    return { imageUrl: null, title: null, description: null };
  }

  try {
    await throttleEbayApiCall();
    const token = await getAccessToken(config);
    const itemId = encodeURIComponent(`v1|${numericId}|0`);
    const res = await fetch(`${config.baseUrl}/buy/browse/v1/item/${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": config.marketplaceId,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { imageUrl: null, title: null, description: null };
    }

    const json = (await res.json()) as {
      title?: string;
      description?: string;
      shortDescription?: string;
      image?: { imageUrl?: string };
      additionalImages?: Array<{ imageUrl?: string }>;
    };

    return {
      imageUrl:
        json.image?.imageUrl ??
        json.additionalImages?.find((img) => img.imageUrl)?.imageUrl ??
        null,
      title: json.title ?? null,
      description: json.description ?? json.shortDescription ?? json.title ?? null,
    };
  } catch {
    return { imageUrl: null, title: null, description: null };
  }
}
