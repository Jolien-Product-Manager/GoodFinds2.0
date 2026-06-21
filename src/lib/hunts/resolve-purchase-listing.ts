import { extractChrono24ListingId } from "@/lib/chrono24/urls";
import { loadChrono24Listings } from "@/lib/chrono24/load-listings";
import { fetchEbayListingMetadata } from "@/lib/ebay/client";
import { fetchEtsyListingMetadata } from "@/lib/etsy/client";
import { loadAllListings } from "@/lib/listings/load-all-listings";
import {
  EMPTY_PURCHASE_LISTING_METADATA,
  stripHtmlText,
  type PurchaseListingMetadata,
} from "./purchase-listing-metadata";
import { findListingMetadataForPurchaseUrl } from "./purchased-watch";

function extractEtsyListingId(url: string): string | null {
  const match = url.match(/\/listing\/(\d+)/i);
  return match?.[1] ?? null;
}

function chrono24MetadataForUrl(purchaseUrl: string): PurchaseListingMetadata | null {
  const id = extractChrono24ListingId(purchaseUrl);
  if (!id) return null;

  for (const listing of loadChrono24Listings()) {
    if (listing.listing_id !== id) continue;
    return {
      imageUrl: listing.image_url ?? listing.image_urls?.[0] ?? null,
      title: listing.title ?? null,
      description: listing.title ?? null,
    };
  }
  return null;
}

async function scrapeOpenGraphMetadata(
  purchaseUrl: string
): Promise<PurchaseListingMetadata> {
  try {
    const res = await fetch(purchaseUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return EMPTY_PURCHASE_LISTING_METADATA;

    const html = await res.text();
    const readMeta = (property: string): string | null => {
      const patterns = [
        new RegExp(
          `property=["']${property}["'][^>]*content=["']([^"']+)["']`,
          "i"
        ),
        new RegExp(
          `content=["']([^"']+)["'][^>]*property=["']${property}["']`,
          "i"
        ),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
      }
      return null;
    };

    const title = readMeta("og:title");
    const description = readMeta("og:description");
    const imageUrl = readMeta("og:image") ?? readMeta("og:image:secure_url");

    return {
      imageUrl,
      title,
      description: description ?? title,
    };
  } catch {
    return EMPTY_PURCHASE_LISTING_METADATA;
  }
}

function mergeMetadata(
  base: PurchaseListingMetadata,
  patch: Partial<PurchaseListingMetadata> | null | undefined
): PurchaseListingMetadata {
  if (!patch) return base;
  return {
    imageUrl: base.imageUrl ?? patch.imageUrl ?? null,
    title: base.title ?? patch.title ?? null,
    description: base.description ?? patch.description ?? null,
  };
}

/** Resolve marketplace photo + text for a purchased-watch URL (server-side). */
export async function resolvePurchaseListingMetadata(
  purchaseUrl: string
): Promise<PurchaseListingMetadata> {
  const { listings } = await loadAllListings();
  let metadata = findListingMetadataForPurchaseUrl(purchaseUrl, listings);

  const fromChrono = chrono24MetadataForUrl(purchaseUrl);
  metadata = mergeMetadata(metadata, fromChrono);

  if (/\/itm\/\d+/i.test(purchaseUrl)) {
    const fromEbay = await fetchEbayListingMetadata(purchaseUrl);
    metadata = mergeMetadata(metadata, {
      ...fromEbay,
      description: fromEbay.description
        ? stripHtmlText(fromEbay.description)
        : fromEbay.description,
    });
  }

  const etsyId = extractEtsyListingId(purchaseUrl);
  if (etsyId) {
    const fromEtsy = await fetchEtsyListingMetadata(etsyId);
    metadata = mergeMetadata(metadata, fromEtsy);
  }

  if (!metadata.imageUrl || !metadata.description) {
    const scraped = await scrapeOpenGraphMetadata(purchaseUrl);
    metadata = mergeMetadata(metadata, scraped);
  }

  return metadata;
}

export async function resolvePurchaseImageUrl(
  purchaseUrl: string
): Promise<string | null> {
  const metadata = await resolvePurchaseListingMetadata(purchaseUrl);
  return metadata.imageUrl;
}
