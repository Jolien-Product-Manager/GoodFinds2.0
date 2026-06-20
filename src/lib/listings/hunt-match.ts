import type { AppListing } from "@/lib/listings/types";
import type { Hunt } from "@/lib/hunts/types";
import type { GlobalFilters } from "@/lib/hunts/types";
import { normalizeCustomValue } from "@/lib/hunts/types";
import { listingMatchesHuntGender } from "@/lib/listings/gender";

export type AttributeMatchStatus = "hit" | "miss" | "unverified";

export interface AttributeMatch {
  key: string;
  label: string;
  status: AttributeMatchStatus;
  confidence?: "high" | "medium" | "low";
}

export interface HuntMatchResult {
  score: number;
  matchedHuntIds: string[];
  matchedHuntNames: string[];
  attributeMatches: AttributeMatch[];
  whyNote: string;
}

function effectiveValues(hunt: Hunt, key: keyof Hunt["attributes"]): string[] {
  const attr = hunt.attributes[key];
  const values = [...attr.picks, ...attr.customs.map(normalizeCustomValue)];
  return values.map(normalizeCustomValue);
}

function huntHasAnyTaste(hunt: Hunt): boolean {
  return Object.values(hunt.attributes).some(
    (a) => a.picks.length > 0 || a.customs.length > 0
  );
}

/** Saved hunt with gender and/or attribute criteria — not an empty "both + no attrs" draft. */
function huntHasActiveCriteria(hunt: Hunt): boolean {
  if (hunt.gender !== "both") return true;
  return huntHasAnyTaste(hunt);
}

function listingValueForAttr(
  listing: AppListing,
  key: string
): string | undefined {
  const f = listing.features;
  switch (key) {
    case "model":
      return f.model?.toLowerCase();
    case "collab":
      return f.collab?.toLowerCase();
    case "dial":
      return f.dial?.toLowerCase();
    case "color":
      return f.color?.toLowerCase();
    case "era":
      return f.era?.toLowerCase();
    case "case":
      return f.case?.toLowerCase();
    case "mvmt":
      return f.mvmt?.toLowerCase();
    case "cond":
      return f.cond?.toLowerCase();
    default:
      return undefined;
  }
}

export function scoreListingAgainstHunt(
  listing: AppListing,
  hunt: Hunt
): { score: number; matches: AttributeMatch[]; excluded: boolean } {
  if (!listingMatchesHuntGender(listing.gender, hunt.gender ?? "both", listing.title)) {
    return { score: 0, matches: [], excluded: true };
  }

  const matches: AttributeMatch[] = [];
  let specified = 0;
  let hits = 0;
  let excluded = false;

  for (const [key, meta] of Object.entries(hunt.attributes) as [
    keyof Hunt["attributes"],
    Hunt["attributes"][keyof Hunt["attributes"]],
  ][]) {
    const wanted = effectiveValues(hunt, key);
    if (wanted.length === 0) continue;

    specified += 1;
    const listingVal = listingValueForAttr(listing, key);
    const label = key;

    if (!listingVal) {
      matches.push({
        key,
        label,
        status: "unverified",
        confidence: listing.features.confidence[key as keyof typeof listing.features.confidence],
      });
      continue;
    }

    const normalizedListing = normalizeCustomValue(listingVal);
    const hit = wanted.some(
      (w) => normalizedListing.includes(w) || w.includes(normalizedListing)
    );

    if (hit) {
      hits += 1;
      matches.push({
        key,
        label,
        status: "hit",
        confidence: listing.features.confidence[key as keyof typeof listing.features.confidence],
      });
    } else {
      matches.push({ key, label, status: "miss" });
      // dealbreaker would exclude — simplified: any miss reduces score, not exclude in phase 4 base
    }
  }

  const score = specified === 0 ? 0.5 : hits / specified;
  return { score, matches, excluded };
}

export function matchAllHunts(
  listings: AppListing[],
  hunts: Hunt[],
  _globalFilters: GlobalFilters
): Map<string, HuntMatchResult> {
  const activeHunts = hunts.filter((h) => h.saved);
  const results = new Map<string, HuntMatchResult>();

  for (const listing of listings) {
    if (activeHunts.length === 0) {
      results.set(listing.id, {
        score: 0.3,
        matchedHuntIds: [],
        matchedHuntNames: [],
        attributeMatches: [],
        whyNote: listing.model
          ? `${listing.model} — vintage Timex in your scan pool`
          : "Vintage Timex listing in your scan pool",
      });
      continue;
    }

    let bestScore = 0;
    let bestMatches: AttributeMatch[] = [];
    const matchedIds: string[] = [];
    const matchedNames: string[] = [];

    for (const hunt of activeHunts) {
      if (!huntHasActiveCriteria(hunt)) continue;
      const { score, matches, excluded } = scoreListingAgainstHunt(listing, hunt);
      if (excluded) continue;
      if (score > 0) {
        matchedIds.push(hunt.id);
        matchedNames.push(hunt.name);
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatches = matches;
      }
    }

    const whyNote =
      matchedNames.length > 0
        ? `Matches ${matchedNames[0]}${bestMatches.filter((m) => m.status === "hit").length ? " — taste overlap on key attributes" : ""}`
        : listing.model
          ? `${listing.model} — no active hunt match yet`
          : "Unverified model — still worth a look";

    results.set(listing.id, {
      score: bestScore,
      matchedHuntIds: matchedIds,
      matchedHuntNames: matchedNames,
      attributeMatches: bestMatches,
      whyNote,
    });
  }

  return results;
}
