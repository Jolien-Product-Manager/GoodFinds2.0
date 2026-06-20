import { loadChrono24Listings } from "@/lib/chrono24/load-listings";
import { fetchEbayListings, hasEbayCredentials } from "@/lib/ebay/client";
import {
  filterVintageListings,
  normalizeChrono24Listing,
  normalizeEbayListing,
} from "./normalize";
import { enrichAllListings } from "./extract-features";
import type { AppListing } from "./types";

export interface LoadAllListingsResult {
  listings: AppListing[];
  sources: { chrono24: number; ebay: number };
  ebayEnabled: boolean;
}

export async function loadAllListings(): Promise<LoadAllListingsResult> {
  const chronoRaw = loadChrono24Listings();
  const chronoNormalized = chronoRaw
    .map(normalizeChrono24Listing)
    .filter((l): l is AppListing => l != null);

  let ebayNormalized: AppListing[] = [];
  const ebayEnabled = hasEbayCredentials();

  if (ebayEnabled) {
    const ebayRaw = await fetchEbayListings();
    ebayNormalized = ebayRaw
      .map(normalizeEbayListing)
      .filter((l): l is AppListing => l != null);
  }

  const merged = filterVintageListings([...chronoNormalized, ...ebayNormalized]);
  const enriched = enrichAllListings(merged);

  // Dedupe by URL fallback
  const seen = new Set<string>();
  const deduped: AppListing[] = [];
  for (const listing of enriched) {
    const key = listing.url;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(listing);
  }

  deduped.sort(
    (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
  );

  return {
    listings: deduped,
    sources: { chrono24: chronoNormalized.length, ebay: ebayNormalized.length },
    ebayEnabled,
  };
}
