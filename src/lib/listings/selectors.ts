import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type { AppListing, AlertScope, CriteriaSettings } from "@/lib/listings/types";
import { passesCriteria } from "@/lib/shipping";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";

interface FilterContext {
  seen: string[];
  listingStatus: Record<string, { interested?: boolean }>;
  hiddenListings: string[];
  dislikedModels: string[];
  modelHearts: Record<string, number>;
  criteria?: CriteriaSettings;
  matchResults?: Map<string, HuntMatchResult>;
}

export function passesListingFilters(
  listing: AppListing,
  ctx: FilterContext
): boolean {
  if (ctx.hiddenListings.includes(listing.id)) return false;
  if (listing.model && ctx.dislikedModels.includes(listing.model)) return false;
  const criteria = ctx.criteria ?? DEFAULT_CRITERIA;
  return passesCriteria(listing, criteria);
}

export function unseenListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter(
    (l) =>
      !ctx.seen.includes(l.id) &&
      !ctx.listingStatus[l.id]?.interested &&
      passesListingFilters(l, ctx)
  );
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
      ctx.seen.includes(l.id) &&
      !ctx.listingStatus[l.id]?.interested &&
      passesListingFilters(l, ctx)
  );
}

export function alertListings(
  listings: AppListing[],
  scope: AlertScope,
  ctx: FilterContext
): AppListing[] {
  let base = unseenListings(listings, ctx);

  if (scope === "watchlist") {
    base = base.filter(
      (l) => l.model != null && (ctx.modelHearts[l.model] ?? 0) >= 1
    );
  } else if (scope === "top") {
    base = base.filter((l) => {
      const match = ctx.matchResults?.get(l.id);
      return match != null && match.score >= 0.7;
    });
  } else if (scope.startsWith("hunt:")) {
    const huntId = scope.slice(5);
    base = base.filter((l) => {
      const match = ctx.matchResults?.get(l.id);
      return match?.matchedHuntIds.includes(huntId);
    });
  }

  return base;
}

export function alertSort(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return [...listings].sort((a, b) => {
    const matchA = ctx.matchResults?.get(a.id);
    const matchB = ctx.matchResults?.get(b.id);
    const scoreA = matchA?.score ?? 0;
    const scoreB = matchB?.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    const heartsA = a.model ? (ctx.modelHearts[a.model] ?? 0) : 0;
    const heartsB = b.model ? (ctx.modelHearts[b.model] ?? 0) : 0;
    if (heartsB !== heartsA) return heartsB - heartsA;

    return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
  });
}
