import type { AppListing, AlertScope } from "@/lib/listings/types";
import { huntHasActiveCriteria, matchAllHunts } from "@/lib/listings/hunt-match";
import { toFeedCardListing } from "@/lib/listings/feed-card-listing";
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  type FeedCountsResponse,
  type FeedPageResponse,
  type FeedQueryBody,
} from "@/lib/listings/feed-api";
import { getCachedListings, invalidateListingsCache } from "@/lib/listings/listings-index";
import {
  alertListings,
  alertSort,
  dismissedListings,
  interestedListings,
  poolListings,
  unseenListings,
  withFilterSets,
} from "@/lib/listings/selectors";
import type { Hunt } from "@/lib/hunts/types";
import { withInferredHuntCriteria } from "@/lib/hunts/domain-terms";
import { normalizeHunt } from "@/lib/hunts/types";

function normalizeHunts(hunts: Hunt[]): Hunt[] {
  return hunts.map((hunt) => withInferredHuntCriteria(normalizeHunt(hunt)));
}

function buildFilterContext(body: FeedQueryBody) {
  const hunts = normalizeHunts(body.hunts ?? []);
  const base = {
    seen: body.seen ?? [],
    listingStatus: body.listingStatus ?? {},
    hiddenListings: body.hiddenListings ?? [],
    dislikedModels: body.dislikedModels ?? [],
    criteria: body.criteria,
    marketplaceFilter: body.marketplaceFilter,
    feedAttributeFilters: body.feedAttributeFilters,
    hunts,
  };
  return withFilterSets(base);
}

function listingMode(feedView: FeedQueryBody["feedView"]): "unseen" | "all" {
  return feedView === "all" ? "all" : "unseen";
}

function displayListingsForView(
  listings: AppListing[],
  body: FeedQueryBody,
  ctx: ReturnType<typeof buildFilterContext>,
  matchResults: ReturnType<typeof matchAllHunts>
): AppListing[] {
  const ctxWithMatches = { ...ctx, matchResults, hunts: ctx.hunts };

  if (body.feedView === "starred") {
    return interestedListings(listings, ctx);
  }

  if (body.feedView === "dismissed") {
    return dismissedListings(listings, ctx);
  }

  return alertSort(
    alertListings(listings, body.alertScope, ctxWithMatches, {
      mode: listingMode(body.feedView),
    }),
    ctxWithMatches
  );
}

async function loadMatchedListings(body: FeedQueryBody) {
  if (body.refresh) {
    invalidateListingsCache();
  }

  const { listings } = await getCachedListings();
  const ctx = buildFilterContext(body);
  const matchResults = matchAllHunts(listings, ctx.hunts ?? [], {
    priceCeiling: 50,
    shipsToMe: true,
    postalCode: "M6K1V8",
  });
  const display = displayListingsForView(listings, body, ctx, matchResults);
  return { listings, ctx, matchResults, display };
}

export async function queryFeedPage(body: FeedQueryBody): Promise<FeedPageResponse> {
  const cursor = Math.max(0, body.cursor ?? 0);
  const limit = Math.min(
    FEED_MAX_LIMIT,
    Math.max(1, body.limit ?? FEED_DEFAULT_LIMIT)
  );

  const { matchResults, display } = await loadMatchedListings(body);
  const page = display.slice(cursor, cursor + limit);
  const nextCursor =
    cursor + limit < display.length ? cursor + limit : null;

  return {
    items: page.map((listing) => ({
      listing: toFeedCardListing(listing),
      match: matchResults.get(listing.id) ?? null,
    })),
    nextCursor,
    total: display.length,
  };
}

export async function queryFeedCounts(
  body: FeedQueryBody
): Promise<FeedCountsResponse> {
  const { listings, ctx, matchResults } = await loadMatchedListings(body);
  const ctxWithMatches = { ...ctx, matchResults, hunts: ctx.hunts };
  const activeHunts = (ctx.hunts ?? []).filter(
    (hunt) => hunt.saved && huntHasActiveCriteria(hunt)
  );

  const perHunt: Record<string, number> = {};
  for (const hunt of activeHunts) {
    perHunt[hunt.id] = alertListings(
      listings,
      `hunt:${hunt.id}` as AlertScope,
      ctxWithMatches
    ).length;
  }

  const ctxWithoutMarketplace = { ...ctx, marketplaceFilter: "all" as const };
  const unseenForMarketplace = unseenListings(listings, ctxWithoutMarketplace);

  return {
    all: poolListings(listings, ctx).length,
    new: unseenListings(listings, ctx).length,
    starred: interestedListings(listings, ctx).length,
    dismissed: dismissedListings(listings, ctx).length,
    huntMatches: alertListings(listings, "watchlist", ctxWithMatches).length,
    perHunt,
    marketplace: {
      all: unseenForMarketplace.length,
      ebay: unseenForMarketplace.filter((listing) => listing.source === "ebay")
        .length,
      chrono24: unseenForMarketplace.filter(
        (listing) => listing.source === "chrono24"
      ).length,
      etsy: unseenForMarketplace.filter((listing) => listing.source === "etsy")
        .length,
    },
  };
}

export async function queryListingDetail(
  id: string,
  hunts: Hunt[]
) {
  const { listings } = await getCachedListings();
  const listing = listings.find((item) => item.id === id);
  if (!listing) return null;

  const normalizedHunts = normalizeHunts(hunts);
  const matchResults = matchAllHunts(listings, normalizedHunts, {
    priceCeiling: 50,
    shipsToMe: true,
    postalCode: "M6K1V8",
  });

  return {
    listing,
    match: matchResults.get(listing.id) ?? null,
  };
}

export async function queryFeedIds(body: FeedQueryBody): Promise<string[]> {
  const { display } = await loadMatchedListings(body);
  return display.map((listing) => listing.id);
}
