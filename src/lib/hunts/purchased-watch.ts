import { extractChrono24ListingId } from "@/lib/chrono24/urls";
import type { AppListing } from "@/lib/listings/types";
import type { PurchasedWatch } from "./types";

export interface ListingImageRef {
  url: string;
  imageUrl: string | null;
}

function extractEbayItemId(url: string): string | null {
  const match = url.match(/\/itm\/(\d+)/i);
  return match?.[1] ?? null;
}

function extractEtsyListingId(url: string): string | null {
  const match = url.match(/\/listing\/(\d+)/i);
  return match?.[1] ?? null;
}

function purchaseUrlKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ebayId = extractEbayItemId(parsed.pathname);
    if (ebayId) return `ebay:${ebayId}`;

    const chronoId = extractChrono24ListingId(url);
    if (chronoId) return `chrono24:${chronoId}`;

    const etsyId = extractEtsyListingId(url);
    if (etsyId) return `etsy:${etsyId}`;

    return `url:${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return null;
  }
}

function listingUrlKey(listingUrl: string): string | null {
  return purchaseUrlKey(listingUrl);
}

/** Resolve a marketplace photo from loaded feed listings when URLs match. */
export function findListingImageForPurchaseUrl(
  purchaseUrl: string,
  listings: Array<Pick<AppListing, "url" | "imageUrl"> | ListingImageRef>
): string | null {
  const key = purchaseUrlKey(purchaseUrl);
  if (!key) return null;

  for (const listing of listings) {
    if (listingUrlKey(listing.url) === key && listing.imageUrl) {
      return listing.imageUrl;
    }
  }
  return null;
}

export function normalizePurchasedWatch(
  raw: Partial<PurchasedWatch> & Pick<PurchasedWatch, "id" | "url">
): PurchasedWatch {
  return {
    id: raw.id,
    url: raw.url,
    parsing: raw.parsing ?? false,
    features: raw.features ?? null,
    imageUrl: raw.imageUrl ?? null,
  };
}

export function backfillPurchasedWatchImages(
  watches: PurchasedWatch[],
  listings: Array<Pick<AppListing, "url" | "imageUrl"> | ListingImageRef>
): PurchasedWatch[] {
  let changed = false;
  const next = watches.map((watch) => {
    if (watch.imageUrl) return watch;
    const imageUrl = findListingImageForPurchaseUrl(watch.url, listings);
    if (!imageUrl) return watch;
    changed = true;
    return { ...watch, imageUrl };
  });
  return changed ? next : watches;
}
