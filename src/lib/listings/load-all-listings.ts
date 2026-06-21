import { loadChrono24Listings } from "@/lib/chrono24/load-listings";
import { enrichChrono24ListingsIfNeeded } from "@/lib/chrono24/enrich-images";
import { fetchEbayListings, hasEbayCredentials } from "@/lib/ebay/client";
import { fetchEtsyListings, hasEtsyCredentials } from "@/lib/etsy/client";
import {
  filterVintageListings,
  normalizeChrono24Listing,
  normalizeEbayListing,
  normalizeEtsyListing,
} from "./normalize";
import { enrichAllListings } from "./extract-features";
import type { AppListing } from "./types";

export interface LoadAllListingsResult {
  listings: AppListing[];
  sources: { chrono24: number; ebay: number; etsy: number };
  ebayEnabled: boolean;
  etsyEnabled: boolean;
}

export async function loadAllListings(): Promise<LoadAllListingsResult> {
  const chronoRaw = await enrichChrono24ListingsIfNeeded(loadChrono24Listings());
  const chronoNormalized = chronoRaw
    .map(normalizeChrono24Listing)
    .filter((l): l is AppListing => l != null);

  if (chronoRaw.length > 0 && chronoNormalized.length === 0) {
    console.warn("Chrono24 listings failed normalization — check data/chrono24/vintage_timex.json");
  }

  let ebayNormalized: AppListing[] = [];
  const ebayEnabled = hasEbayCredentials();

  if (ebayEnabled) {
    const ebayRaw = await fetchEbayListings();
    ebayNormalized = ebayRaw
      .map(normalizeEbayListing)
      .filter((l): l is AppListing => l != null);
  }

  let etsyNormalized: AppListing[] = [];
  const etsyEnabled = hasEtsyCredentials();

  if (etsyEnabled) {
    const etsyRaw = await fetchEtsyListings();
    etsyNormalized = etsyRaw
      .map(normalizeEtsyListing)
      .filter((l): l is AppListing => l != null);
  }

  const merged = filterVintageListings([
    ...chronoNormalized,
    ...ebayNormalized,
    ...etsyNormalized,
  ]);
  const enriched = enrichAllListings(merged);

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
    sources: {
      chrono24: chronoNormalized.length,
      ebay: ebayNormalized.length,
      etsy: etsyNormalized.length,
    },
    ebayEnabled,
    etsyEnabled,
  };
}
