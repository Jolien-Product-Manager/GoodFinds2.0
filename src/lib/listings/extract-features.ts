import type { AppListing } from "./types";
import { eraFromYear, matchListingToModel } from "@/lib/models/catalog";

export function enrichListingFeatures(listing: AppListing): AppListing {
  const model = listing.model ?? matchListingToModel(listing.title);
  const era = listing.features.era ?? eraFromYear(listing.year);

  let mvmt = listing.features.mvmt;
  if (!mvmt) {
    const lower = listing.title.toLowerCase();
    if (lower.includes("automatic")) mvmt = "Self-wind / auto";
    else if (lower.includes("electric")) mvmt = "Electric";
    else if (lower.includes("manual") || lower.includes("mechanical"))
      mvmt = "Manual wind";
  }

  return {
    ...listing,
    model,
    features: {
      ...listing.features,
      model: model ?? undefined,
      era,
      mvmt,
      confidence: {
        ...listing.features.confidence,
        model: model ? listing.features.confidence.model ?? "low" : undefined,
        era: listing.year ? "medium" : listing.features.confidence.era,
        mvmt: mvmt ? "medium" : undefined,
      },
    },
  };
}

export function enrichAllListings(listings: AppListing[]): AppListing[] {
  return listings.map(enrichListingFeatures);
}
