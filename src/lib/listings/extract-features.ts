import type { AppListing } from "./types";
import { inferCollabFromTitle } from "./collab";
import {
  completenessFromCondition,
  inferCompletenessFromTitle,
  inferCrystalFromTitle,
  inferDateCodeFromTitle,
  inferDialOrigFromTitle,
  inferPlatingFromTitle,
  inferRunningFromTitle,
  runningFromCondition,
} from "./infer-buyer-axes";
import { eraFromYear, matchListingToModel } from "@/lib/models/catalog";

export function enrichListingFeatures(listing: AppListing): AppListing {
  const model = listing.model ?? matchListingToModel(listing.title);
  const era = listing.features.era ?? eraFromYear(listing.year);

  let mvmt = listing.features.mvmt;
  if (!mvmt) {
    const lower = listing.title.toLowerCase();
    if (lower.includes("quartz")) mvmt = "Quartz";
    else if (lower.includes("automatic")) mvmt = "Self-wind / auto";
    else if (lower.includes("electric")) mvmt = "Electric";
    else if (lower.includes("manual") || lower.includes("mechanical"))
      mvmt = "Manual wind";
  }

  const collab = listing.features.collab ?? inferCollabFromTitle(listing.title);
  const datecode =
    listing.features.datecode ?? inferDateCodeFromTitle(listing.title);
  const dialOrig =
    listing.features.dialOrig ?? inferDialOrigFromTitle(listing.title);
  const plating =
    listing.features.plating ?? inferPlatingFromTitle(listing.title);
  const crystal =
    listing.features.crystal ?? inferCrystalFromTitle(listing.title);
  const running =
    listing.features.running ??
    inferRunningFromTitle(listing.title) ??
    runningFromCondition(listing.condition);
  const complete =
    listing.features.complete ??
    inferCompletenessFromTitle(listing.title) ??
    completenessFromCondition(listing.condition);

  return {
    ...listing,
    model,
    features: {
      ...listing.features,
      model: model ?? undefined,
      era,
      mvmt,
      collab,
      datecode,
      dialOrig,
      plating,
      crystal,
      running,
      complete,
      confidence: {
        ...listing.features.confidence,
        model: model ? listing.features.confidence.model ?? "low" : undefined,
        era: listing.year ? "medium" : listing.features.confidence.era,
        mvmt: mvmt ? "medium" : undefined,
        collab: collab ? "medium" : undefined,
        datecode: datecode ? "medium" : undefined,
        dialOrig: dialOrig ? "medium" : undefined,
        plating: plating ? "low" : undefined,
        crystal: crystal ? "low" : undefined,
        running: running ? "medium" : undefined,
        complete: complete ? "medium" : undefined,
      },
    },
  };
}

export function enrichAllListings(listings: AppListing[]): AppListing[] {
  return listings.map(enrichListingFeatures);
}
