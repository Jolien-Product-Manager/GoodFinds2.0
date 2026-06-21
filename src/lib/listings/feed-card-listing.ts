import type { AppListing } from "./types";

/** Slim listing payload for feed cards — omits description and extra gallery URLs. */
export function toFeedCardListing(listing: AppListing): AppListing {
  return {
    id: listing.id,
    source: listing.source,
    title: listing.title,
    url: listing.url,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrl ? [listing.imageUrl] : [],
    priceValue: listing.priceValue,
    priceCurrency: listing.priceCurrency,
    year: listing.year,
    isVintage: listing.isVintage,
    model: listing.model,
    condition: listing.condition,
    shippingCost: listing.shippingCost,
    shippingConfirmed: listing.shippingConfirmed,
    sellerCountry: listing.sellerCountry,
    listedAt: listing.listedAt,
    gender: listing.gender,
    features: {
      model: listing.features.model,
      era: listing.features.era,
      collab: listing.features.collab,
      dial: listing.features.dial,
      color: listing.features.color,
      mvmt: listing.features.mvmt,
      complications: listing.features.complications,
      datecode: listing.features.datecode,
      dialOrig: listing.features.dialOrig,
      plating: listing.features.plating,
      crystal: listing.features.crystal,
      running: listing.features.running,
      complete: listing.features.complete,
      confidence: listing.features.confidence,
    },
  };
}
