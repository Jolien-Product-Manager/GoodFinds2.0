import {
  ETSY_DEFAULT_QUERY,
  ETSY_PAGE_SIZE,
  ETSY_SEARCH_LIMIT,
  etsyListingSchema,
  etsySearchResponseSchema,
  type EtsyListing,
} from "./schema";
import {
  etsySnapshotAgeMinutes,
  readEtsySnapshot,
  writeEtsySnapshot,
} from "./snapshot";
import { shouldExcludeEtsyTitle } from "./title-filter";

const API_BASE = "https://api.etsy.com/v3/application";
const MEMORY_TTL_MS = 6 * 60 * 60 * 1000;
const PAGE_DELAY_MS = 250;

let memoryCache: { listings: EtsyListing[]; fetchedAt: number } | null = null;
let inFlightFetch: Promise<EtsyListing[]> | null = null;

function getEtsyApiKey(): string | null {
  const combined = process.env.ETSY_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (combined) return combined;

  const keystring = process.env.ETSY_KEYSTRING?.trim().replace(/^["']|["']$/g, "");
  const sharedSecret = process.env.ETSY_SHARED_SECRET?.trim().replace(/^["']|["']$/g, "");
  if (keystring && sharedSecret) return `${keystring}:${sharedSecret}`;

  return null;
}

function resolveSearchLimit(): number {
  const raw = process.env.ETSY_SEARCH_LIMIT;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return ETSY_SEARCH_LIMIT;
}

function forceRefreshRequested(): boolean {
  return process.env.ETSY_FORCE_REFRESH === "1";
}

function resolveSearchQueries(): string[] {
  const raw = process.env.ETSY_SEARCH_QUERIES?.trim();
  if (raw) {
    return raw
      .split("|")
      .map((q) => q.trim())
      .filter(Boolean);
  }
  return [ETSY_DEFAULT_QUERY];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function etsyFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getEtsyApiKey();
  if (!apiKey) throw new Error("Etsy API key not configured");

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Etsy API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

async function searchListingsPage(
  keywords: string,
  offset: number,
  limit: number
): Promise<EtsyListing[]> {
  const json = await etsyFetch("/listings/active", {
    keywords,
    limit: String(limit),
    offset: String(offset),
    sort_on: "created",
    sort_order: "desc",
  });

  const parsed = etsySearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("Etsy search response validation failed:", parsed.error.message);
    return [];
  }

  return parsed.data.results ?? [];
}

async function enrichListingImages(listings: EtsyListing[]): Promise<EtsyListing[]> {
  if (listings.length === 0) return listings;

  const needsImages = listings.filter(
    (l) => !l.images?.length && l.listing_id != null
  );
  if (needsImages.length === 0) return listings;

  const imageById = new Map<number, EtsyListing["images"]>();
  const chunkSize = 100;

  for (let i = 0; i < needsImages.length; i += chunkSize) {
    const chunk = needsImages.slice(i, i + chunkSize);
    const ids = chunk.map((l) => l.listing_id).join(",");

    try {
      const json = await etsyFetch("/listings/batch", {
        listing_ids: ids,
        includes: "Images",
      });
      const parsed = etsySearchResponseSchema.safeParse(json);
      for (const listing of parsed.success ? (parsed.data.results ?? []) : []) {
        if (listing.images?.length) {
          imageById.set(listing.listing_id, listing.images);
        }
      }
    } catch (err) {
      console.warn("Etsy batch image fetch failed:", err);
    }

    if (i + chunkSize < needsImages.length) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return listings.map((listing) => {
    const images = listing.images?.length
      ? listing.images
      : imageById.get(listing.listing_id);
    return images?.length ? { ...listing, images } : listing;
  });
}

async function fetchEtsyListingsFromApi(maxResults: number): Promise<EtsyListing[]> {
  const queries = resolveSearchQueries();
  const byId = new Map<number, EtsyListing>();

  for (const keywords of queries) {
    let offset = 0;
    while (byId.size < maxResults) {
      const remaining = maxResults - byId.size;
      const limit = Math.min(ETSY_PAGE_SIZE, remaining);
      let page: EtsyListing[];

      try {
        page = await searchListingsPage(keywords, offset, limit);
      } catch (err) {
        console.warn(`Etsy search failed for "${keywords}":`, err);
        break;
      }

      if (page.length === 0) break;

      for (const listing of page) {
        const parsed = etsyListingSchema.safeParse(listing);
        if (!parsed.success) continue;
        if (shouldExcludeEtsyTitle(parsed.data.title)) continue;
        byId.set(parsed.data.listing_id, parsed.data);
      }

      offset += page.length;
      if (page.length < limit) break;
      await sleep(PAGE_DELAY_MS);
    }
  }

  const listings = [...byId.values()].slice(0, maxResults);
  return enrichListingImages(listings);
}

function useMemoryCache(): EtsyListing[] | null {
  if (!memoryCache) return null;
  if (Date.now() - memoryCache.fetchedAt > MEMORY_TTL_MS) return null;
  return memoryCache.listings;
}

function cacheListings(listings: EtsyListing[]): EtsyListing[] {
  memoryCache = { listings, fetchedAt: Date.now() };
  if (listings.length > 0) writeEtsySnapshot(listings);
  return listings;
}

function useDiskCache(reason: string): EtsyListing[] {
  const cached = readEtsySnapshot();
  if (!cached || cached.length === 0) return [];
  const age = etsySnapshotAgeMinutes();
  console.warn(
    `Using cached Etsy listings (${cached.length}) — ${reason}` +
      (age != null ? ` (cache ${age}m old)` : "")
  );
  memoryCache = { listings: cached, fetchedAt: Date.now() };
  return cached;
}

async function fetchEtsyListingsInternal(): Promise<EtsyListing[]> {
  const fromMemory = useMemoryCache();
  if (fromMemory) return fromMemory;

  const diskCached = readEtsySnapshot();
  const hasDiskCache = (diskCached?.length ?? 0) > 0;

  if (!forceRefreshRequested()) {
    if (hasDiskCache) {
      return useDiskCache("snapshot preferred over live fetch");
    }
  }

  const apiKey = getEtsyApiKey();
  if (!apiKey) {
    if (hasDiskCache) {
      return useDiskCache("no API credentials");
    }
    return [];
  }

  if (!forceRefreshRequested()) {
    return [];
  }

  try {
    const fresh = await fetchEtsyListingsFromApi(resolveSearchLimit());
    if (fresh.length > 0) {
      return cacheListings(fresh);
    }
  } catch (err) {
    console.warn("Etsy fetch error:", err);
  }

  if (hasDiskCache) {
    return useDiskCache("API returned no results");
  }

  return [];
}

export async function fetchEtsyListings(): Promise<EtsyListing[]> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = fetchEtsyListingsInternal().finally(() => {
    inFlightFetch = null;
  });

  return inFlightFetch;
}

export function hasEtsyCredentials(): boolean {
  return getEtsyApiKey() != null;
}

export interface EtsyListingMetadata {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
}

/** Fetch listing photos for a single Etsy listing id. */
export async function fetchEtsyListingImage(listingId: string): Promise<string | null> {
  const metadata = await fetchEtsyListingMetadata(listingId);
  return metadata.imageUrl;
}

/** Fetch listing photo + text for a single Etsy listing id. */
export async function fetchEtsyListingMetadata(
  listingId: string
): Promise<EtsyListingMetadata> {
  const fromPublic = await fetchEtsyPublicListingMetadata(listingId);
  if (fromPublic.imageUrl || fromPublic.title || fromPublic.description) {
    return fromPublic;
  }

  if (!getEtsyApiKey()) {
    return { imageUrl: null, title: null, description: null };
  }

  try {
    const json = await etsyFetch(`/listings/${listingId}`, {
      includes: "Images",
    });
    const parsed = etsyListingSchema.safeParse(json);
    if (!parsed.success) {
      return { imageUrl: null, title: null, description: null };
    }

    const images = parsed.data.images ?? [];
    const first = images[0];

    return {
      imageUrl:
        first?.url_fullxfull ??
        first?.url_570xN ??
        first?.url_170x135 ??
        null,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? parsed.data.title ?? null,
    };
  } catch {
    return { imageUrl: null, title: null, description: null };
  }
}

async function fetchEtsyPublicListingMetadata(
  listingId: string
): Promise<EtsyListingMetadata> {
  try {
    const res = await fetch(
      `https://www.etsy.com/api/v3/ajax/public/listings/${listingId}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { imageUrl: null, title: null, description: null };
    }

    const json = (await res.json()) as {
      title?: string;
      description?: string;
      images?: string[];
    };

    return {
      imageUrl: json.images?.[0] ?? null,
      title: json.title ?? null,
      description: json.description ?? json.title ?? null,
    };
  } catch {
    return { imageUrl: null, title: null, description: null };
  }
}
