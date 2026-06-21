import type { AppListing } from "@/lib/listings/types";
import type { Hunt, HuntHearts, HuntGender } from "@/lib/hunts/types";
import type { GlobalFilters } from "@/lib/hunts/types";
import { normalizeCustomValue, HUNT_GENDER_OPTIONS, isGenderRequired } from "@/lib/hunts/types";
import { collabPickMatchesListing, resolveListingCollab } from "@/lib/listings/collab";
import { complicationPickMatchesListing } from "@/lib/listings/complications";
import { completenessPickMatchesTitle } from "@/lib/listings/infer-buyer-axes";
import { storeFindPickMatchesListing } from "@/lib/listings/store-find";
import {
  huntNameImpliesCriteria,
  withInferredHuntCriteria,
} from "@/lib/hunts/domain-terms";
import {
  genderSearchText,
  hasMensSignals,
  hasWomensSignals,
  listingMatchesHuntGender,
} from "@/lib/listings/gender";
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
  /** Human-readable attributes/signals that passed for this hunt. */
  matchedOn: string[];
  /** Hit attribute matches for listing card chips. */
  attributeMatches: AttributeMatch[];
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

function huntGenderLabel(gender: HuntGender): string {
  return HUNT_GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? gender;
}

function listingFeatureForMatch(
  listing: AppListing,
  key: string
): string | undefined {
  const f = listing.features;
  switch (key) {
    case "model":
      return f.model ?? listing.model ?? undefined;
    case "collab":
      return f.collab;
    case "complications":
      return f.complications;
    case "dial":
      return f.dial;
    case "color":
      return f.color;
    case "era":
      return f.era;
    case "datecode":
      return f.datecode;
    case "dialOrig":
      return f.dialOrig;
    case "plating":
      return f.plating;
    case "crystal":
      return f.crystal;
    case "running":
      return f.running;
    case "complete":
      return f.complete;
    case "mvmt":
      return f.mvmt;
    default:
      return undefined;
  }
}

function stripPresetAlias(label: string): string {
  const base = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return base || label;
}

function isCategoryLabel(key: string, label: string): boolean {
  const categoryLabel = ATTR_OPTIONS[key as keyof typeof ATTR_OPTIONS]?.label;
  return Boolean(
    categoryLabel &&
      normalizeCustomValue(label) === normalizeCustomValue(categoryLabel)
  );
}

/** User-facing chip text — the matched characteristic, not the category name. */
export function characteristicDisplayLabel(
  match: AttributeMatch,
  listing?: AppListing
): string {
  if (match.key === "traits") return match.label;

  const listingValue = listing
    ? listingFeatureForMatch(listing, match.key)
    : undefined;
  if (listingValue) return listingValue;

  if (match.label && !isCategoryLabel(match.key, match.label)) {
    return stripPresetAlias(match.label);
  }

  return stripPresetAlias(match.label);
}

function attributeMatchLabel(match: AttributeMatch, listing: AppListing): string {
  return characteristicDisplayLabel(match, listing);
}

function genderMatchedLabels(hunt: Hunt, listing: AppListing): string[] {
  const combined = genderSearchText(listing.title, listing.description);
  const labels: string[] = [];
  if (hasWomensSignals(combined)) labels.push("Ladies/women's");
  if (hasMensSignals(combined)) labels.push("Men's");
  if (labels.length > 0) return labels;
  if (listing.gender === "mens") labels.push("Men's");
  else if (listing.gender === "womens") labels.push("Ladies/women's");
  else if (listing.gender === "unisex") labels.push("Unisex");
  if (labels.length > 0) return labels;
  if (hunt.gender !== "both") {
    labels.push(huntGenderLabel(hunt.gender));
  }
  return labels;
}

function matchedOnLabels(
  hunt: Hunt,
  listing: AppListing,
  matches: AttributeMatch[],
  isGenderOnly: boolean
): string[] {
  const attributeHits = matches
    .filter((m) => m.status === "hit")
    .map((m) => attributeMatchLabel(m, listing));
  if (attributeHits.length > 0) return attributeHits;
  if (isGenderOnly) return genderMatchedLabels(hunt, listing);
  return [];
}

function effectivePickLabels(
  hunt: Hunt,
  key: keyof Hunt["attributes"]
): string[] {
  const attr = hunt.attributes[key];
  if (!attr) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...attr.picks, ...attr.customs]) {
    const norm = normalizeCustomValue(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(raw);
  }
  return out;
}

function huntHasAnyTaste(hunt: Hunt): boolean {
  return Object.values(hunt.attributes).some(
    (a) => a.picks.length > 0 || a.customs.length > 0
  );
}

/** Saved hunt with gender and/or attribute criteria — not an empty "both + no attrs" draft. */
export function huntHasActiveCriteria(hunt: Hunt): boolean {
  if (hunt.gender !== "both") return true;
  if (huntHasAnyTaste(hunt)) return true;
  return huntNameImpliesCriteria(hunt);
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
    case "complications":
      return f.complications?.toLowerCase();
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
      f.complications,
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
      const matched = wanted.find((w) => collabPickMatchesListing(w, listing));
      return {
        passed: true,
        match: {
          key,
          label: matched ?? inferred ?? label,
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

  if (key === "complications") {
    const hit = wanted.some((w) =>
      complicationPickMatchesListing(w, listing.title, listing.description)
    );
    if (hit) {
      const matched = wanted.find((w) =>
        complicationPickMatchesListing(w, listing.title, listing.description)
      );
      return {
        passed: true,
        match: {
          key,
          label: matched ?? label,
          status: "hit",
          confidence: "medium",
        },
      };
    }
    return { passed: false, match: { key, label, status: "miss" } };
  }

  if (key === "complete") {
    const hit = wanted.some((w) => completenessPickMatchesTitle(w, listing.title));
    const resolved = listing.features.complete;
    const matched = wanted.find((w) =>
      completenessPickMatchesTitle(w, listing.title)
    );
    if (hit) {
      return {
        passed: true,
        match: {
          key,
          label: matched ?? resolved ?? label,
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
    const matched = wanted.find((w) => {
      if (storeFindPickMatchesListing(w, listing)) return true;
      const norm = normalizeCustomValue(w);
      return norm.length > 0 && haystack.includes(norm);
    });
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
  const hit = wanted.some((w) => {
    const norm = normalizeCustomValue(w);
    return normalizedListing.includes(norm) || norm.includes(normalizedListing);
  });

  if (hit) {
    const matched = wanted.find((w) => {
      const norm = normalizeCustomValue(w);
      return normalizedListing.includes(norm) || norm.includes(normalizedListing);
    });
    return {
      passed: true,
      match: {
        key,
        label: matched ?? listingVal ?? label,
        status: "hit",
        confidence:
          listing.features.confidence[key as keyof typeof listing.features.confidence],
      },
    };
  }

  return { passed: false, match: { key, label, status: "miss" } };
}

function formatOverlapList(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function buildMatchWhyNote(
  listing: AppListing,
  matchedNames: string[],
  huntContributions: HuntScoreContribution[],
  bestMatches: AttributeMatch[]
): string {
  if (matchedNames.length === 0) {
    return listing.model
      ? `${listing.model} — no active hunt match yet`
      : "Unverified model — still worth a look";
  }

  const topContribution = huntContributions[0];
  let overlapLabels = topContribution?.matchedOn ?? [];

  if (overlapLabels.length === 0) {
    overlapLabels = bestMatches
      .filter((match) => match.status === "hit")
      .map((match) => characteristicDisplayLabel(match, listing));
  }

  if (overlapLabels.length === 0) {
    return `Matches ${matchedNames[0]}`;
  }

  return `Matches ${matchedNames[0]} on ${formatOverlapList(overlapLabels)}`;
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
  matchedOn: string[];
} {
  hunt = withInferredHuntCriteria(hunt);
  const hearts = hunt.hearts ?? 2;
  const gender = hunt.gender ?? "both";
  const genderMatches = listingMatchesHuntGender(
    listing.gender,
    gender,
    listing.title,
    listing.description
  );

  const matches: AttributeMatch[] = [];
  let categoriesPassed = 0;
  let totalCategories = 0;
  let requiredFailed = false;

  if (gender !== "both" && isGenderRequired(hunt) && !genderMatches) {
    requiredFailed = true;
  }

  if (gender !== "both" && hunt.genderRequired === false) {
    totalCategories += 1;
    if (genderMatches) categoriesPassed += 1;
  }

  for (const [key, meta] of Object.entries(hunt.attributes) as [
    keyof Hunt["attributes"],
    Hunt["attributes"][keyof Hunt["attributes"]],
  ][]) {
    const wanted = effectivePickLabels(hunt, key);
    if (wanted.length === 0) continue;

    totalCategories += 1;
    const { passed, match } = categoryPasses(listing, key, wanted);
    matches.push(match);

    if (passed) {
      categoriesPassed += 1;
    } else if (meta.required && !meta.requiredPicks?.length) {
      requiredFailed = true;
    }

    for (const pick of meta.requiredPicks ?? []) {
      const { passed: pickPassed } = categoryPasses(listing, key, [pick]);
      if (!pickPassed) {
        requiredFailed = true;
      }
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
      matchedOn: [],
    };
  }

  const multiplier = HEARTS_SCORE_MULTIPLIER[hearts];
  const isGenderOnly = totalCategories === 0;
  // Gender-only hunt: gate passed, no attribute chips — still counts as a match.
  const finalCategoriesPassed = isGenderOnly ? 1 : categoriesPassed;
  const finalTotalCategories = isGenderOnly ? 1 : totalCategories;
  const pointsContributed = finalCategoriesPassed * multiplier;
  const matchedOn = matchedOnLabels(hunt, listing, matches, isGenderOnly);

  return {
    pointsContributed,
    matches,
    excluded: false,
    categoriesPassed: finalCategoriesPassed,
    totalCategories: finalTotalCategories,
    hearts,
    matchedOn,
  };
}

export function matchListingForHunts(
  listing: AppListing,
  hunts: Hunt[]
): HuntMatchResult {
  const activeHunts = hunts.filter((h) => h.saved);

  if (activeHunts.length === 0) {
    return {
      score: 0,
      matchedHuntIds: [],
      matchedHuntNames: [],
      attributeMatches: [],
      whyNote: listing.model
        ? `${listing.model} — vintage Timex in your scan pool`
        : "Vintage Timex listing in your scan pool",
      huntContributions: [],
    };
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
      categoriesPassed,
      totalCategories,
      hearts,
      matchedOn,
    } = scoreListingAgainstHunt(listing, hunt);

    if (pointsContributed <= 0) continue;

    listingScore += pointsContributed;
    huntContributions.push({
      huntId: hunt.id,
      huntName: hunt.name,
      categoriesPassed,
      totalCategories,
      hearts,
      pointsContributed,
      matchedOn,
      attributeMatches: matches.filter((m) => m.status === "hit"),
    });

    if (pointsContributed > bestContribution) {
      bestContribution = pointsContributed;
      bestMatches = matches;
    }
  }

  huntContributions.sort((a, b) => b.pointsContributed - a.pointsContributed);

  const matchedIds = huntContributions.map((c) => c.huntId);
  const matchedNames = huntContributions.map((c) => c.huntName);

  const whyNote = buildMatchWhyNote(
    listing,
    matchedNames,
    huntContributions,
    bestMatches
  );

  return {
    score: listingScore,
    matchedHuntIds: matchedIds,
    matchedHuntNames: matchedNames,
    attributeMatches: bestMatches,
    whyNote,
    huntContributions,
  };
}

export function matchAllHunts(
  listings: AppListing[],
  hunts: Hunt[],
  _globalFilters: GlobalFilters
): Map<string, HuntMatchResult> {
  const results = new Map<string, HuntMatchResult>();

  for (const listing of listings) {
    results.set(listing.id, matchListingForHunts(listing, hunts));
  }

  return results;
}

export type MatchQualityLevel = "perfect" | "close" | "loose";

export interface MatchQuality {
  label: string;
  level: MatchQualityLevel;
}

/** User-facing match tier from the top hunt contribution's category pass ratio. */
export function matchQualityFromContribution(
  contribution: HuntScoreContribution
): MatchQuality | null {
  const { categoriesPassed, totalCategories } = contribution;
  if (categoriesPassed <= 0 || totalCategories <= 0) return null;

  if (categoriesPassed >= totalCategories) {
    return { label: "Perfect Match", level: "perfect" };
  }

  if (categoriesPassed / totalCategories > 0.5) {
    return { label: "Close Match", level: "close" };
  }

  return { label: "Loose Match", level: "loose" };
}

export function matchQualityFromResult(
  match: HuntMatchResult
): MatchQuality | null {
  const top = match.huntContributions[0];
  if (!top) return null;
  return matchQualityFromContribution(top);
}

export function matchQualityDotClass(level: MatchQualityLevel): string {
  switch (level) {
    case "perfect":
      return "bg-ok";
    case "close":
      return "bg-brass";
    case "loose":
      return "bg-ink-soft";
  }
}

export function formatHuntContributionBadge(contribution: HuntScoreContribution): string {
  return `${contribution.huntName} — ${contribution.categoriesPassed}/${contribution.totalCategories} (${contribution.hearts} hearts)`;
}

export function formatHuntContributionLine(
  contribution: HuntScoreContribution
): string {
  const matched =
    contribution.matchedOn.length > 0
      ? contribution.matchedOn.join(", ")
      : `${contribution.categoriesPassed}/${contribution.totalCategories} categories`;
  return `${contribution.huntName} — ${matched}`;
}
