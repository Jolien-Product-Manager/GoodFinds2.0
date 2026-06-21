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

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
let memoryCache: { listings: EbayItemSummary[]; fetchedAt: number } | null = null;
let inFlightFetch: Promise<EbayItemSummary[]> | null = null;

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

function resolveSearchLimit(): number {
  const raw = process.env.EBAY_SEARCH_LIMIT;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return EBAY_SEARCH_LIMIT;
}

/** Live page-load fetch: one page by default. Full pagination is for manual sync only. */
function resolveLiveFetchLimit(): number {
  const raw = process.env.EBAY_LIVE_FETCH_LIMIT;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), EBAY_PAGE_SIZE);
  }
  return EBAY_PAGE_SIZE;
}

function forceRefreshRequested(): boolean {
  return process.env.EBAY_FORCE_REFRESH === "1";
}

async function getAccessToken(config: NonNullable<ReturnType<typeof getEbayConfig>>): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.token;
  }

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

async function fetchEbaySearchPage(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  token: string,
  offset: number,
  limit: number
): Promise<{ items: EbayItemSummary[]; rateLimited: boolean }> {
  const aspectFilter = `categoryId:${EBAY_WRISTWATCH_CATEGORY_ID},Brand:{${EBAY_BRAND}}`;
  const params = new URLSearchParams({
    q: EBAY_DEFAULT_QUERY,
    category_ids: EBAY_WRISTWATCH_CATEGORY_ID,
    aspect_filter: aspectFilter,
    limit: String(limit),
    offset: String(offset),
    sort: "newlyListed",
  });

  const res = await fetch(
    `${config.baseUrl}/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": config.marketplaceId,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.warn("eBay search failed:", res.status, "offset", offset);
    return { items: [], rateLimited: res.status === 429 };
  }

  const json = await res.json();
  const parsed = ebaySearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("eBay response validation failed:", parsed.error.message);
    return { items: [], rateLimited: false };
  }

  return { items: parsed.data.itemSummaries ?? [], rateLimited: false };
}

async function fetchEbayListingsFromApi(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  maxResults: number
): Promise<EbayItemSummary[]> {
  const token = await getAccessToken(config);
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
  }

  return results;
}

function useMemoryCache(): EbayItemSummary[] | null {
  if (!memoryCache) return null;
  if (Date.now() - memoryCache.fetchedAt > MEMORY_TTL_MS) return null;
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

  const fetchLimit = forceRefreshRequested()
    ? resolveSearchLimit()
    : resolveLiveFetchLimit();

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
