import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type {
  AppListing,
  CriteriaSettings,
  MarketplaceFilter,
  MatchQualityLevel,
} from "@/lib/listings/types";
import type { HuntAttribute, AttrKey, Hunt } from "@/lib/hunts/types";
import { listingPassesFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import { passesCriteria } from "@/lib/shipping";
import {
  matchQualityFromResult,
  type HuntMatchResult,
} from "@/lib/listings/hunt-match";

interface FilterContext {
  seen: string[];
  dismissed: string[];
  listingStatus: Record<string, { interested?: boolean }>;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria?: CriteriaSettings;
  marketplaceFilter?: MarketplaceFilter;
  feedAttributeFilters?: Partial<Record<AttrKey, HuntAttribute>>;
  selectedHuntIds?: string[];
  selectedMatchQualities?: MatchQualityLevel[];
  matchResults?: Map<string, HuntMatchResult>;
  hunts?: Hunt[];
  seenSet?: Set<string>;
  dismissedSet?: Set<string>;
  hiddenSet?: Set<string>;
  dislikedModelSet?: Set<string>;
}

function isSeen(id: string, ctx: FilterContext): boolean {
  return ctx.seenSet ? ctx.seenSet.has(id) : ctx.seen.includes(id);
}

function isDismissed(id: string, ctx: FilterContext): boolean {
  return ctx.dismissedSet
    ? ctx.dismissedSet.has(id)
    : (ctx.dismissed ?? []).includes(id);
}

function isHidden(id: string, ctx: FilterContext): boolean {
  return ctx.hiddenSet ? ctx.hiddenSet.has(id) : ctx.hiddenListings.includes(id);
}

function isDislikedModel(model: string, ctx: FilterContext): boolean {
  return ctx.dislikedModelSet
    ? ctx.dislikedModelSet.has(model)
    : ctx.dislikedModels.includes(model);
}

export function withFilterSets(ctx: FilterContext): FilterContext {
  return {
    ...ctx,
    seenSet: ctx.seenSet ?? new Set(ctx.seen),
    dismissedSet: ctx.dismissedSet ?? new Set(ctx.dismissed ?? []),
    hiddenSet: ctx.hiddenSet ?? new Set(ctx.hiddenListings),
    dislikedModelSet: ctx.dislikedModelSet ?? new Set(ctx.dislikedModels),
  };
}

function passesActiveFeed(listing: AppListing, ctx: FilterContext): boolean {
  return !isDismissed(listing.id, ctx) && passesListingFilters(listing, ctx);
}

export function passesListingFilters(
  listing: AppListing,
  ctx: FilterContext
): boolean {
  if (isHidden(listing.id, ctx)) return false;
  if (listing.model && isDislikedModel(listing.model, ctx)) return false;
  if (
    ctx.marketplaceFilter &&
    ctx.marketplaceFilter !== "all" &&
    listing.source !== ctx.marketplaceFilter
  ) {
    return false;
  }
  if (!listingPassesFeedAttributeFilters(listing, ctx.feedAttributeFilters)) {
    return false;
  }
  const criteria = ctx.criteria ?? DEFAULT_CRITERIA;
  return passesCriteria(listing, criteria);
}

export function unseenListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter((l) => !isSeen(l.id, ctx) && passesActiveFeed(l, ctx));
}

export function interestedListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter(
    (l) =>
      ctx.listingStatus[l.id]?.interested &&
      passesListingFilters(l, ctx)
  );
}

export function dismissedListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter(
    (l) =>
      isDismissed(l.id, ctx) &&
      !ctx.listingStatus[l.id]?.interested &&
      passesListingFilters(l, ctx)
  );
}

export function poolListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter((l) => passesActiveFeed(l, ctx));
}

export function alertListings(
  listings: AppListing[],
  ctx: FilterContext,
  options?: { mode?: "unseen" | "all" }
): AppListing[] {
  const mode = options?.mode ?? "unseen";
  let base =
    mode === "all"
      ? poolListings(listings, ctx)
      : unseenListings(listings, ctx);

  const selectedHuntIds = ctx.selectedHuntIds ?? [];
  if (selectedHuntIds.length > 0) {
    const huntSet = new Set(selectedHuntIds);
    base = base.filter((l) => {
      const match = ctx.matchResults?.get(l.id);
      return match?.matchedHuntIds.some((id) => huntSet.has(id));
    });
  }

  const selectedQualities = ctx.selectedMatchQualities ?? [];
  if (selectedQualities.length > 0) {
    const qualitySet = new Set(selectedQualities);
    base = base.filter((l) => {
      const level = matchQualityFromResult(ctx.matchResults?.get(l.id)!)?.level;
      return level != null && qualitySet.has(level);
    });
  }

  return base;
}

function isPerfectMatch(match: HuntMatchResult | undefined): boolean {
  if (!match) return false;
  return matchQualityFromResult(match)?.level === "perfect";
}

export function alertSort(
  listings: AppListing[],
  ctx: FilterContext,
  options?: { unseenFirst?: boolean }
): AppListing[] {
  return [...listings].sort((a, b) => {
    const matchA = ctx.matchResults?.get(a.id);
    const matchB = ctx.matchResults?.get(b.id);
    const perfectA = isPerfectMatch(matchA);
    const perfectB = isPerfectMatch(matchB);
    if (perfectA !== perfectB) return perfectA ? -1 : 1;

    if (options?.unseenFirst) {
      const seenA = isSeen(a.id, ctx);
      const seenB = isSeen(b.id, ctx);
      if (seenA !== seenB) return seenA ? 1 : -1;
    }

    const scoreA = matchA?.score ?? 0;
    const scoreB = matchB?.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
  });
}
