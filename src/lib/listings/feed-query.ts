import type { AppListing } from "@/lib/listings/types";
import {
  huntHasActiveCriteria,
  matchAllHunts,
  matchListingForHunts,
} from "@/lib/listings/hunt-match";
import { toFeedCardListing } from "@/lib/listings/feed-card-listing";
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  type FeedCountsResponse,
  type FeedPageResponse,
  type FeedQueryBody,
} from "@/lib/listings/feed-api";
import { getCachedListings, invalidateListingsCache } from "@/lib/listings/listings-index";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { DEFAULT_ALLOWED_CONDITIONS, normalizeAllowedConditions } from "@/lib/listings/condition-filter";
import type { CriteriaSettings } from "@/lib/listings/types";
import {
  alertListings,
  alertSort,
  dismissedListings,
  interestedListings,
  poolListings,
  unseenListings,
  withFilterSets,
} from "@/lib/listings/selectors";
import { matchQualityFromResult } from "@/lib/listings/hunt-match";
import type { Hunt } from "@/lib/hunts/types";
import { withInferredHuntCriteria } from "@/lib/hunts/domain-terms";
import { normalizeHunt } from "@/lib/hunts/types";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";

const SNAPSHOT_TTL_MS =
  process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 60_000;

interface FeedSnapshot {
  listings: AppListing[];
  ctx: ReturnType<typeof buildFilterContext>;
  matchResults: Map<string, HuntMatchResult>;
  display: AppListing[];
}

const snapshotCache = new Map<string, { snapshot: FeedSnapshot; fetchedAt: number }>();
const snapshotInFlight = new Map<string, Promise<FeedSnapshot>>();

function normalizeFeedCriteria(raw: CriteriaSettings | undefined): CriteriaSettings {
  const base = { ...DEFAULT_CRITERIA, ...raw };
  const allowedConditions = normalizeAllowedConditions(
    base.allowedConditions,
    base.excludeForParts
  );
  return {
    ...base,
    allowedConditions,
    excludeForParts: !allowedConditions.includes("For parts / project"),
  };
}

function normalizeHunts(hunts: Hunt[]): Hunt[] {
  const normalized: Hunt[] = [];
  for (const hunt of hunts ?? []) {
    try {
      if (!hunt?.id || !hunt?.name) continue;
      normalized.push(withInferredHuntCriteria(normalizeHunt(hunt)));
    } catch (err) {
      console.warn(
        "Skipping malformed hunt:",
        hunt?.id ?? hunt?.name,
        err instanceof Error ? err.message : err
      );
    }
  }
  return normalized;
}

function buildFilterContext(body: FeedQueryBody) {
  const hunts = normalizeHunts(body.hunts ?? []);
  const base = {
    seen: body.seen ?? [],
    dismissed: body.dismissed ?? [],
    listingStatus: body.listingStatus ?? {},
    hiddenListings: body.hiddenListings ?? [],
    dislikedModels: body.dislikedModels ?? [],
    criteria: normalizeFeedCriteria(body.criteria),
    marketplaceFilter: body.marketplaceFilter,
    feedAttributeFilters: body.feedAttributeFilters,
    selectedHuntIds: body.selectedHuntIds ?? [],
    selectedMatchQualities: body.selectedMatchQualities ?? [],
    hunts,
  };
  return withFilterSets(base);
}

function listingMode(_feedView: FeedQueryBody["feedView"]): "unseen" | "all" {
  return "all";
}

function sortUnseenFirst(feedView: FeedQueryBody["feedView"]): boolean {
  return feedView === "new";
}

function displayListingsForView(
  listings: AppListing[],
  body: FeedQueryBody,
  ctx: ReturnType<typeof buildFilterContext>,
  matchResults: Map<string, HuntMatchResult>
): AppListing[] {
  const ctxWithMatches = { ...ctx, matchResults, hunts: ctx.hunts };

  if (body.feedView === "starred") {
    return interestedListings(listings, ctx);
  }

  if (body.feedView === "dismissed") {
    return dismissedListings(listings, ctx);
  }

  return alertSort(
    alertListings(listings, ctxWithMatches, {
      mode: listingMode(body.feedView),
    }),
    ctxWithMatches,
    { unseenFirst: sortUnseenFirst(body.feedView) }
  );
}

function getSnapshotCacheKey(body: FeedQueryBody): string {
  const { cursor, limit, refresh, listingStatus, feedView, unseenOnly, ...rest } =
    body;
  const statusPart =
    feedView === "starred" || feedView === "dismissed" ? listingStatus : null;
  return JSON.stringify({ ...rest, feedView, listingStatus: statusPart });
}

function bustSnapshotCache(cacheKey?: string) {
  if (cacheKey) {
    snapshotCache.delete(cacheKey);
    snapshotInFlight.delete(cacheKey);
    return;
  }
  snapshotCache.clear();
  snapshotInFlight.clear();
}

async function buildFeedSnapshot(body: FeedQueryBody): Promise<FeedSnapshot> {
  if (body.refresh) {
    invalidateListingsCache();
    bustSnapshotCache();
  }

  const { listings } = await getCachedListings();
  const ctx = buildFilterContext(body);
  const activeHunts = (ctx.hunts ?? []).filter(
    (hunt) => hunt.saved && !hunt.archived && huntHasActiveCriteria(hunt)
  );
  const matchPool = poolListings(listings, ctx);
  const matchResults =
    activeHunts.length === 0
      ? new Map<string, HuntMatchResult>()
      : matchAllHunts(matchPool, activeHunts, {
          priceCeiling: ctx.criteria?.maxTotalCost ?? 50,
          shipsToMe: ctx.criteria?.shipsToMe ?? true,
          postalCode: ctx.criteria?.postalCode ?? "M6K1V8",
          allowedConditions:
            ctx.criteria?.allowedConditions ?? DEFAULT_ALLOWED_CONDITIONS,
        });
  const display = displayListingsForView(listings, body, ctx, matchResults);
  return { listings, ctx, matchResults, display };
}

async function getFeedSnapshot(body: FeedQueryBody): Promise<FeedSnapshot> {
  const cacheKey = getSnapshotCacheKey(body);

  if (body.refresh) {
    bustSnapshotCache(cacheKey);
  }

  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < SNAPSHOT_TTL_MS) {
    return cached.snapshot;
  }

  let pending = snapshotInFlight.get(cacheKey);
  if (!pending) {
    pending = buildFeedSnapshot(body)
      .then((snapshot) => {
        snapshotCache.set(cacheKey, { snapshot, fetchedAt: Date.now() });
        return snapshot;
      })
      .finally(() => {
        if (snapshotInFlight.get(cacheKey) === pending) {
          snapshotInFlight.delete(cacheKey);
        }
      });
    snapshotInFlight.set(cacheKey, pending);
  }

  return pending;
}

function buildMatchQualityCounts(
  listings: AppListing[],
  body: FeedQueryBody,
  ctx: ReturnType<typeof buildFilterContext>,
  matchResults: Map<string, HuntMatchResult>
): FeedCountsResponse["matchQuality"] {
  const ctxWithMatches = {
    ...ctx,
    matchResults,
    selectedHuntIds: body.selectedHuntIds ?? [],
    selectedMatchQualities: [],
  };
  const base = alertListings(listings, ctxWithMatches, {
    mode: listingMode(body.feedView),
  });

  const counts = { perfect: 0, close: 0, loose: 0 };
  for (const listing of base) {
    const level = matchQualityFromResult(matchResults.get(listing.id)!)?.level;
    if (level === "perfect") counts.perfect += 1;
    else if (level === "close") counts.close += 1;
    else if (level === "loose") counts.loose += 1;
  }
  return counts;
}

function buildFeedCounts(
  body: FeedQueryBody,
  snapshot: FeedSnapshot
): FeedCountsResponse {
  const { listings, ctx, matchResults } = snapshot;
  const ctxWithMatches = { ...ctx, matchResults, hunts: ctx.hunts };
  const activeHunts = (ctx.hunts ?? []).filter(
    (hunt) => hunt.saved && !hunt.archived && huntHasActiveCriteria(hunt)
  );

  const perHunt: Record<string, number> = {};
  for (const hunt of activeHunts) {
    perHunt[hunt.id] = alertListings(
      listings,
      {
        ...ctxWithMatches,
        selectedHuntIds: [hunt.id],
        selectedMatchQualities: [],
      }
    ).length;
  }

  const ctxWithoutMarketplace = { ...ctx, marketplaceFilter: "all" as const };
  const unseenForMarketplace = unseenListings(listings, ctxWithoutMarketplace);

  return {
    all: poolListings(listings, ctx).length,
    new: unseenListings(listings, ctx).length,
    starred: interestedListings(listings, ctx).length,
    dismissed: dismissedListings(listings, ctx).length,
    huntMatches: alertListings(listings, {
      ...ctxWithMatches,
      selectedHuntIds: activeHunts.map((hunt) => hunt.id),
      selectedMatchQualities: [],
    }).length,
    perHunt,
    matchQuality: buildMatchQualityCounts(listings, body, ctx, matchResults),
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

function sliceFeedPage(
  snapshot: FeedSnapshot,
  body: FeedQueryBody
): FeedPageResponse {
  const cursor = Math.max(0, body.cursor ?? 0);
  const limit = Math.min(
    FEED_MAX_LIMIT,
    Math.max(1, body.limit ?? FEED_DEFAULT_LIMIT)
  );
  const page = snapshot.display.slice(cursor, cursor + limit);
  const nextCursor =
    cursor + limit < snapshot.display.length ? cursor + limit : null;

  return {
    items: page.map((listing) => ({
      listing: toFeedCardListing(listing),
      match: snapshot.matchResults.get(listing.id) ?? null,
    })),
    nextCursor,
    total: snapshot.display.length,
  };
}

export async function queryFeedPage(body: FeedQueryBody): Promise<FeedPageResponse> {
  const snapshot = await getFeedSnapshot(body);
  return sliceFeedPage(snapshot, body);
}

export async function queryFeedCounts(
  body: FeedQueryBody
): Promise<FeedCountsResponse> {
  const snapshot = await getFeedSnapshot(body);
  return buildFeedCounts(body, snapshot);
}

export async function queryFeedBootstrap(body: FeedQueryBody): Promise<{
  page: FeedPageResponse;
  counts: FeedCountsResponse;
}> {
  const snapshot = await getFeedSnapshot(body);
  return {
    page: sliceFeedPage(snapshot, body),
    counts: buildFeedCounts(body, snapshot),
  };
}

export async function queryListingDetail(id: string, hunts: Hunt[]) {
  const { listings } = await getCachedListings();
  const listing = listings.find((item) => item.id === id);
  if (!listing) return null;

  const normalizedHunts = normalizeHunts(hunts);
  return {
    listing,
    match: matchListingForHunts(listing, normalizedHunts),
  };
}

export async function queryFeedIds(body: FeedQueryBody): Promise<string[]> {
  const snapshot = await getFeedSnapshot(body);
  const ctx = snapshot.ctx;
  const listings = body.unseenOnly
    ? snapshot.display.filter((listing) => !ctx.seenSet?.has(listing.id))
    : snapshot.display;
  return listings.map((listing) => listing.id);
}
