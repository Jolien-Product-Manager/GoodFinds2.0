import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type {
  AppListing,
  AlertScope,
  CriteriaSettings,
  MarketplaceFilter,
} from "@/lib/listings/types";
import type { HuntAttribute, AttrKey, Hunt } from "@/lib/hunts/types";
import { listingPassesFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import { passesCriteria } from "@/lib/shipping";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";

interface FilterContext {
  seen: string[];
  listingStatus: Record<string, { interested?: boolean }>;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria?: CriteriaSettings;
  marketplaceFilter?: MarketplaceFilter;
  feedAttributeFilters?: Partial<Record<AttrKey, HuntAttribute>>;
  matchResults?: Map<string, HuntMatchResult>;
  hunts?: Hunt[];
}

export function passesListingFilters(
  listing: AppListing,
  ctx: FilterContext
): boolean {
  if (ctx.hiddenListings.includes(listing.id)) return false;
  if (listing.model && ctx.dislikedModels.includes(listing.model)) return false;
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

export function poolListings(
  listings: AppListing[],
  ctx: FilterContext
): AppListing[] {
  return listings.filter((l) => passesListingFilters(l, ctx));
}

export function alertListings(
  listings: AppListing[],
  scope: AlertScope,
  ctx: FilterContext,
  options?: { mode?: "unseen" | "all" }
): AppListing[] {
  const mode = options?.mode ?? "unseen";
  let base =
    mode === "all"
      ? poolListings(listings, ctx)
      : unseenListings(listings, ctx);

  if (scope === "watchlist") {
    base = base.filter((l) => {
      const match = ctx.matchResults?.get(l.id);
      return match != null && match.matchedHuntIds.length > 0;
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

    return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
  });
}
