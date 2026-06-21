import { extractChrono24ListingId } from "@/lib/chrono24/urls";
import type { AppListing } from "@/lib/listings/types";
import { DEFAULT_PURCHASED_WATCHES } from "./default-purchased-watches";
import { extractPurchasedWatchFeatures } from "./purchased-watch-features";
import {
  EMPTY_PURCHASE_LISTING_METADATA,
  mergePurchaseListingMetadata,
  type PurchaseListingMetadata,
} from "./purchase-listing-metadata";
import type { PurchasedWatch } from "./types";

export interface ListingImageRef {
  url: string;
  imageUrl: string | null;
  title?: string | null;
  description?: string | null;
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

/** Resolve marketplace metadata from loaded feed listings when URLs match. */
export function findListingMetadataForPurchaseUrl(
  purchaseUrl: string,
  listings: Array<
    Pick<AppListing, "url" | "imageUrl" | "title" | "description"> | ListingImageRef
  >
): PurchaseListingMetadata {
  const key = purchaseUrlKey(purchaseUrl);
  if (!key) return EMPTY_PURCHASE_LISTING_METADATA;

  for (const listing of listings) {
    if (listingUrlKey(listing.url) !== key) continue;
    const withMeta = listing as ListingImageRef &
      Partial<Pick<AppListing, "title" | "description">>;
    const title = withMeta.title ?? null;
    const description = withMeta.description ?? title;
    return {
      imageUrl: listing.imageUrl ?? null,
      title,
      description,
    };
  }
  return EMPTY_PURCHASE_LISTING_METADATA;
}

/** @deprecated Use findListingMetadataForPurchaseUrl */
export function findListingImageForPurchaseUrl(
  purchaseUrl: string,
  listings: Array<Pick<AppListing, "url" | "imageUrl"> | ListingImageRef>
): string | null {
  return findListingMetadataForPurchaseUrl(purchaseUrl, listings).imageUrl;
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
    title: raw.title ?? null,
    description: raw.description ?? null,
  };
}

export function applyPurchaseListingMetadata(
  watch: PurchasedWatch,
  metadata: Partial<PurchaseListingMetadata> | null | undefined
): PurchasedWatch {
  const merged = mergePurchaseListingMetadata(watch, metadata);
  return {
    ...watch,
    imageUrl: merged.imageUrl,
    title: merged.title,
    description: merged.description,
  };
}

export function backfillPurchasedWatchMetadata(
  watches: PurchasedWatch[],
  listings: Array<
    Pick<AppListing, "url" | "imageUrl" | "title" | "description"> | ListingImageRef
  >
): PurchasedWatch[] {
  let changed = false;
  const next = watches.map((watch) => {
    const metadata = findListingMetadataForPurchaseUrl(watch.url, listings);
    if (!metadata.imageUrl && !metadata.title && !metadata.description) {
      return watch;
    }
    const updated = applyPurchaseListingMetadata(watch, metadata);
    if (
      updated.imageUrl === watch.imageUrl &&
      updated.title === watch.title &&
      updated.description === watch.description
    ) {
      return watch;
    }
    changed = true;
    return updated;
  });
  return changed ? next : watches;
}

/** @deprecated Use backfillPurchasedWatchMetadata */
export function backfillPurchasedWatchImages(
  watches: PurchasedWatch[],
  listings: Array<Pick<AppListing, "url" | "imageUrl"> | ListingImageRef>
): PurchasedWatch[] {
  return backfillPurchasedWatchMetadata(watches, listings);
}

/** Apply owner seed watches when empty, or backfill photo/title for matching URLs. */
export function mergeDefaultPurchasedWatches(
  watches: PurchasedWatch[]
): PurchasedWatch[] {
  const defaults = DEFAULT_PURCHASED_WATCHES.map((watch) =>
    normalizePurchasedWatch(watch)
  );

  if (watches.length === 0) {
    return defaults;
  }

  const defaultByUrl = new Map(
    defaults.flatMap((watch) => {
      const key = purchaseUrlKey(watch.url);
      return key ? ([[key, watch]] as const) : [];
    })
  );

  return watches.map((watch) => {
    const normalized = normalizePurchasedWatch(watch);
    const key = purchaseUrlKey(normalized.url);
    const seed = key ? defaultByUrl.get(key) : undefined;
    const merged = seed
      ? {
          ...normalized,
          imageUrl: normalized.imageUrl ?? seed.imageUrl,
          title: normalized.title ?? seed.title,
          description: normalized.description ?? seed.description,
        }
      : normalized;

    return {
      ...merged,
      features: extractPurchasedWatchFeatures(merged),
    };
  });
}
