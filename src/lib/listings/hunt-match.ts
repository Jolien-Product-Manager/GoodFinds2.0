import type { AppListing } from "@/lib/listings/types";
import type { Hunt, HuntHearts } from "@/lib/hunts/types";
import type { GlobalFilters } from "@/lib/hunts/types";
import { normalizeCustomValue } from "@/lib/hunts/types";
import { collabPickMatchesListing, resolveListingCollab } from "@/lib/listings/collab";
import { completenessPickMatchesTitle } from "@/lib/listings/infer-buyer-axes";
import { listingMatchesHuntGender } from "@/lib/listings/gender";
import { ATTR_OPTIONS } from "@/lib/hunts/types";

export type AttributeMatchStatus = "hit" | "miss" | "unverified";

export interface AttributeMatch {
  key: string;
  label: string;
  status: AttributeMatchStatus;
  confidence?: "high" | "medium" | "low";
}

/** Hearts → score multiplier (retune here without changing call sites). */
export const HEARTS_SCORE_MULTIPLIER: Record<HuntHearts, number> = {
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1.0,
};

export interface HuntScoreContribution {
  huntId: string;
  huntName: string;
  categoriesPassed: number;
  totalCategories: number;
  hearts: HuntHearts;
  pointsContributed: number;
}

export interface HuntMatchResult {
  /** Sum of per-hunt contributions; used for feed sort only (no fixed ceiling). */
  score: number;
  matchedHuntIds: string[];
  matchedHuntNames: string[];
  attributeMatches: AttributeMatch[];
  whyNote: string;
  huntContributions: HuntScoreContribution[];
}

function effectiveValues(hunt: Hunt, key: keyof Hunt["attributes"]): string[] {
  const attr = hunt.attributes[key];
  if (!attr) return [];
  const values = [...attr.picks, ...attr.customs.map(normalizeCustomValue)];
  return values.map(normalizeCustomValue);
}

function huntHasAnyTaste(hunt: Hunt): boolean {
  return Object.values(hunt.attributes).some(
    (a) => a.picks.length > 0 || a.customs.length > 0
  );
}

/** Saved hunt with gender and/or attribute criteria — not an empty "both + no attrs" draft. */
export function huntHasActiveCriteria(hunt: Hunt): boolean {
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
    case "datecode":
      return f.datecode?.toLowerCase();
    case "dialOrig":
      return f.dialOrig?.toLowerCase();
    case "plating":
      return f.plating?.toLowerCase();
    case "crystal":
      return f.crystal?.toLowerCase();
    case "running":
      return f.running?.toLowerCase();
    case "complete":
      return f.complete?.toLowerCase();
    case "mvmt":
      return f.mvmt?.toLowerCase();
    default:
      return undefined;
  }
}

function attributeLabel(key: string): string {
  return ATTR_OPTIONS[key as keyof typeof ATTR_OPTIONS]?.label ?? key;
}

function listingSearchText(listing: AppListing): string {
  const f = listing.features;
  return normalizeCustomValue(
    [
      listing.title,
      f.model,
      f.collab,
      f.dial,
      f.color,
      f.era,
      f.datecode,
      f.dialOrig,
      f.plating,
      f.crystal,
      f.running,
      f.complete,
      f.mvmt,
      f.storeFind,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function categoryPasses(
  listing: AppListing,
  key: keyof Hunt["attributes"],
  wanted: string[]
): { passed: boolean; match: AttributeMatch } {
  const label = attributeLabel(key);
  const listingVal = listingValueForAttr(listing, key);

  if (key === "collab") {
    const hit = wanted.some((w) => collabPickMatchesListing(w, listing));
    const inferred = resolveListingCollab(listing);
    if (hit) {
      return {
        passed: true,
        match: {
          key,
          label,
          status: "hit",
          confidence: inferred
            ? (listing.features.confidence.collab ?? "medium")
            : listing.features.confidence.collab,
        },
      };
    }
    if (!inferred && wanted.every((w) => normalizeCustomValue(w) !== "any collab")) {
      return {
        passed: false,
        match: {
          key,
          label,
          status: "unverified",
          confidence: listing.features.confidence.collab,
        },
      };
    }
    return { passed: false, match: { key, label, status: "miss" } };
  }

  if (key === "complete") {
    const hit = wanted.some((w) => completenessPickMatchesTitle(w, listing.title));
    const resolved = listing.features.complete;
    if (hit) {
      return {
        passed: true,
        match: {
          key,
          label,
          status: "hit",
          confidence: resolved
            ? (listing.features.confidence.complete ?? "medium")
            : listing.features.confidence.complete,
        },
      };
    }
    if (!resolved) {
      return {
        passed: false,
        match: {
          key,
          label,
          status: "unverified",
          confidence: listing.features.confidence.complete,
        },
      };
    }
    return { passed: false, match: { key, label, status: "miss" } };
  }

  if (key === "traits") {
    const haystack = listingSearchText(listing);
    const matched = wanted.find((w) => w.length > 0 && haystack.includes(w));
    if (matched) {
      return {
        passed: true,
        match: { key, label: matched, status: "hit", confidence: "medium" },
      };
    }
    return {
      passed: false,
      match: { key, label: wanted[0] ?? key, status: "miss" },
    };
  }

  if (!listingVal) {
    return {
      passed: false,
      match: {
        key,
        label,
        status: "unverified",
        confidence:
          listing.features.confidence[key as keyof typeof listing.features.confidence],
      },
    };
  }

  const normalizedListing = normalizeCustomValue(listingVal);
  const hit = wanted.some(
    (w) => normalizedListing.includes(w) || w.includes(normalizedListing)
  );

  if (hit) {
    return {
      passed: true,
      match: {
        key,
        label,
        status: "hit",
        confidence:
          listing.features.confidence[key as keyof typeof listing.features.confidence],
      },
    };
  }

  return { passed: false, match: { key, label, status: "miss" } };
}

export function scoreListingAgainstHunt(
  listing: AppListing,
  hunt: Hunt
): {
  pointsContributed: number;
  matches: AttributeMatch[];
  excluded: boolean;
  categoriesPassed: number;
  totalCategories: number;
  hearts: HuntHearts;
} {
  const hearts = hunt.hearts ?? 2;

  if (!listingMatchesHuntGender(
    listing.gender,
    hunt.gender ?? "both",
    listing.title,
    listing.description
  )) {
    return {
      pointsContributed: 0,
      matches: [],
      excluded: true,
      categoriesPassed: 0,
      totalCategories: 0,
      hearts,
    };
  }

  const matches: AttributeMatch[] = [];
  let categoriesPassed = 0;
  let totalCategories = 0;
  let requiredFailed = false;

  for (const [key, meta] of Object.entries(hunt.attributes) as [
    keyof Hunt["attributes"],
    Hunt["attributes"][keyof Hunt["attributes"]],
  ][]) {
    const wanted = effectiveValues(hunt, key);
    if (wanted.length === 0) continue;

    totalCategories += 1;
    const { passed, match } = categoryPasses(listing, key, wanted);
    matches.push(match);

    if (passed) {
      categoriesPassed += 1;
    } else if (meta.required) {
      requiredFailed = true;
    }
  }

  if (requiredFailed) {
    return {
      pointsContributed: 0,
      matches,
      excluded: false,
      categoriesPassed,
      totalCategories,
      hearts,
    };
  }

  const multiplier = HEARTS_SCORE_MULTIPLIER[hearts];
  const pointsContributed = categoriesPassed * multiplier;

  return {
    pointsContributed,
    matches,
    excluded: false,
    categoriesPassed,
    totalCategories,
    hearts,
  };
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
        score: 0,
        matchedHuntIds: [],
        matchedHuntNames: [],
        attributeMatches: [],
        whyNote: listing.model
          ? `${listing.model} — vintage Timex in your scan pool`
          : "Vintage Timex listing in your scan pool",
        huntContributions: [],
      });
      continue;
    }

    let listingScore = 0;
    const huntContributions: HuntScoreContribution[] = [];
    let bestMatches: AttributeMatch[] = [];
    let bestContribution = 0;

    for (const hunt of activeHunts) {
      if (!huntHasActiveCriteria(hunt)) continue;

      const {
        pointsContributed,
        matches,
        excluded,
        categoriesPassed,
        totalCategories,
        hearts,
      } = scoreListingAgainstHunt(listing, hunt);

      if (excluded || pointsContributed <= 0) continue;

      listingScore += pointsContributed;
      huntContributions.push({
        huntId: hunt.id,
        huntName: hunt.name,
        categoriesPassed,
        totalCategories,
        hearts,
        pointsContributed,
      });

      if (pointsContributed > bestContribution) {
        bestContribution = pointsContributed;
        bestMatches = matches;
      }
    }

    huntContributions.sort((a, b) => b.pointsContributed - a.pointsContributed);

    const matchedIds = huntContributions.map((c) => c.huntId);
    const matchedNames = huntContributions.map((c) => c.huntName);

    const whyNote =
      matchedNames.length > 0
        ? `Matches ${matchedNames[0]}${bestMatches.filter((m) => m.status === "hit").length ? " — taste overlap on key attributes" : ""}`
        : listing.model
          ? `${listing.model} — no active hunt match yet`
          : "Unverified model — still worth a look";

    results.set(listing.id, {
      score: listingScore,
      matchedHuntIds: matchedIds,
      matchedHuntNames: matchedNames,
      attributeMatches: bestMatches,
      whyNote,
      huntContributions,
    });
  }

  return results;
}

export function formatHuntContributionBadge(contribution: HuntScoreContribution): string {
  return `${contribution.huntName} — ${contribution.categoriesPassed}/${contribution.totalCategories} (${contribution.hearts} hearts)`;
}
