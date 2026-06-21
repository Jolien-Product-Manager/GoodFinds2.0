import type { AppListing } from "./types";
import { loadAllListings, type LoadAllListingsResult } from "./load-all-listings";

const CACHE_TTL_MS = 10 * 60 * 1000;

let cached: { result: LoadAllListingsResult; fetchedAt: number } | null = null;
let inFlight: Promise<LoadAllListingsResult> | null = null;

export function invalidateListingsCache(): void {
  cached = null;
  inFlight = null;
}

export async function getCachedListings(): Promise<LoadAllListingsResult> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  if (!inFlight) {
    inFlight = loadAllListings()
      .then((result) => {
        cached = { result, fetchedAt: Date.now() };
        return result;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

export function findListingById(
  listings: AppListing[],
  id: string
): AppListing | undefined {
  return listings.find((listing) => listing.id === id);
}

export function findListingByUrl(
  listings: AppListing[],
  url: string
): AppListing | undefined {
  const normalized = url.trim();
  if (!normalized) return undefined;
  return listings.find((listing) => listing.url === normalized);
}
