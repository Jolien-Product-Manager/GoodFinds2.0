"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertListingCard } from "@/components/alert-listing-card";
import { ListingDetailPanel } from "@/components/listing-detail-panel";
import { FeedSidebar } from "@/components/feed-sidebar";
import { HuntQuickFilter } from "@/components/hunt-quick-filter";
import type {
  FeedCountsResponse,
  FeedItem,
  FeedQueryBody,
} from "@/lib/listings/feed-api";
import type { AppListing, AlertScope, MarketplaceFilter } from "@/lib/listings/types";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";
import { huntHasActiveCriteria } from "@/lib/listings/hunt-match";
import { hasActiveFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import { useCasebackStore, type FeedView } from "@/store/caseback";
import {
  isAttributeValueSelected,
  type AttrKey,
} from "@/lib/hunts/types";
import { cn } from "@/lib/utils";

interface FeedViewProps {
  ebayEnabled: boolean;
}

const EMPTY_COUNTS: FeedCountsResponse = {
  all: 0,
  new: 0,
  starred: 0,
  dismissed: 0,
  huntMatches: 0,
  perHunt: {},
  marketplace: { all: 0, ebay: 0, chrono24: 0, etsy: 0 },
};

function feedContextSuffix(
  feedView: FeedView,
  alertScope: AlertScope,
  marketplaceFilter: MarketplaceFilter,
  activeHunts: { id: string; name: string }[],
  newCount?: number
): string {
  if (feedView === "starred") return "saved";
  if (feedView === "dismissed") return "dismissed";
  if (feedView === "all") {
    let suffix = "all listings";
    if (alertScope.startsWith("hunt:")) {
      const huntId = alertScope.slice(5);
      const hunt = activeHunts.find((h) => h.id === huntId);
      suffix = `all · matching ${hunt?.name ?? "this hunt"}`;
    } else if (alertScope === "watchlist") {
      suffix = "all · matching any of your hunts";
    }
    if (marketplaceFilter === "ebay") suffix += " · eBay";
    else if (marketplaceFilter === "chrono24") suffix += " · Chrono24";
    else if (marketplaceFilter === "etsy") suffix += " · Etsy";
    return suffix;
  }

  let suffix =
    newCount != null && newCount > 0
      ? `listings · ${newCount.toLocaleString()} new`
      : "listings";
  if (alertScope.startsWith("hunt:")) {
    const huntId = alertScope.slice(5);
    const hunt = activeHunts.find((h) => h.id === huntId);
    suffix = `${suffix} · matching ${hunt?.name ?? "this hunt"}`;
  } else if (alertScope === "watchlist") {
    suffix = `${suffix} · matching any of your hunts`;
  }

  if (marketplaceFilter === "ebay") suffix += " · eBay";
  else if (marketplaceFilter === "chrono24") suffix += " · Chrono24";
  else if (marketplaceFilter === "etsy") suffix += " · Etsy";

  return suffix;
}

async function parseFeedError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function postFeedPage(body: FeedQueryBody) {
  const res = await fetch("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseFeedError(res));
  return res.json() as Promise<{
    items: FeedItem[];
    nextCursor: number | null;
    total: number;
  }>;
}

async function postFeedBootstrap(body: FeedQueryBody) {
  const res = await fetch("/api/feed/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseFeedError(res));
  return res.json() as Promise<{
    page: {
      items: FeedItem[];
      nextCursor: number | null;
      total: number;
    };
    counts: FeedCountsResponse;
  }>;
}

async function postFeedCounts(body: FeedQueryBody) {
  const res = await fetch("/api/feed/counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to load feed counts");
  return res.json() as Promise<FeedCountsResponse>;
}

async function postFeedIds(body: FeedQueryBody) {
  const res = await fetch("/api/feed/ids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to load feed ids");
  const data = (await res.json()) as { ids: string[] };
  return data.ids;
}

export function FeedView({ ebayEnabled }: FeedViewProps) {
  const seen = useCasebackStore((s) => s.seen);
  const dismissed = useCasebackStore((s) => s.dismissed);
  const listingStatus = useCasebackStore((s) => s.listingStatus);
  const alertScope = useCasebackStore((s) => s.alertScope);
  const marketplaceFilter = useCasebackStore((s) => s.marketplaceFilter);
  const feedView = useCasebackStore((s) => s.feedView);
  const criteria = useCasebackStore((s) => s.criteria);
  const hunts = useCasebackStore((s) => s.hunts);
  const hiddenListings = useCasebackStore((s) => s.hiddenListings);
  const dislikedModels = useCasebackStore((s) => s.dislikedModels);
  const feedAttributeFilters = useCasebackStore((s) => s.feedAttributeFilters);
  const attributeLibrary = useCasebackStore((s) => s.attributeLibrary ?? {});

  const dismissListing = useCasebackStore((s) => s.dismissListing);
  const dismissAllUnseen = useCasebackStore((s) => s.dismissAllUnseen);
  const restoreListing = useCasebackStore((s) => s.restoreListing);
  const markListingSeen = useCasebackStore((s) => s.markListingSeen);
  const restoreAll = useCasebackStore((s) => s.restoreAll);
  const toggleInterested = useCasebackStore((s) => s.toggleInterested);
  const setAlertScope = useCasebackStore((s) => s.setAlertScope);
  const setMarketplaceFilter = useCasebackStore((s) => s.setMarketplaceFilter);
  const setFeedView = useCasebackStore((s) => s.setFeedView);
  const toggleFeedAttributeFilter = useCasebackStore((s) => s.toggleFeedAttributeFilter);
  const clearFeedAttributeFilters = useCasebackStore((s) => s.clearFeedAttributeFilters);
  const addAttributeLibraryOption = useCasebackStore((s) => s.addAttributeLibraryOption);

  const seenSet = useMemo(() => new Set(seen), [seen]);

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState<FeedCountsResponse>(EMPTY_COUNTS);
  const [feedLoadError, setFeedLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [detailListing, setDetailListing] = useState<AppListing | null>(null);
  const [detailMatch, setDetailMatch] = useState<HuntMatchResult | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchGeneration = useRef(0);
  const pendingRefresh = useRef(false);

  const feedQueryBody = useMemo<FeedQueryBody>(
    () => ({
      feedView,
      alertScope,
      marketplaceFilter,
      seen,
      dismissed,
      listingStatus,
      hiddenListings,
      dislikedModels,
      criteria,
      feedAttributeFilters,
      hunts,
    }),
    [
      feedView,
      alertScope,
      marketplaceFilter,
      seen,
      dismissed,
      listingStatus,
      hiddenListings,
      dislikedModels,
      criteria,
      feedAttributeFilters,
      hunts,
    ]
  );

  const feedQueryBodyRef = useRef(feedQueryBody);
  feedQueryBodyRef.current = feedQueryBody;

  const feedReloadKey = useMemo(
    () =>
      JSON.stringify({
        feedView,
        alertScope,
        marketplaceFilter,
        dismissed,
        hiddenListings,
        dislikedModels,
        criteria,
        feedAttributeFilters,
        hunts,
        listingStatus:
          feedView === "starred" || feedView === "dismissed" ? listingStatus : null,
      }),
    [
      feedView,
      alertScope,
      marketplaceFilter,
      dismissed,
      hiddenListings,
      dislikedModels,
      criteria,
      feedAttributeFilters,
      hunts,
      listingStatus,
    ]
  );

  const activeHunts = useMemo(
    () => hunts.filter((h) => h.saved && !h.archived && huntHasActiveCriteria(h)),
    [hunts]
  );

  const reloadFeed = useCallback(async (options?: { refresh?: boolean }) => {
    const generation = ++fetchGeneration.current;
    setLoading(true);
    setFeedItems([]);
    setNextCursor(0);
    setSelectedListingId(null);
    setDetailListing(null);
    setDetailMatch(null);
    setFeedLoadError(null);

    try {
      const { page, counts } = await postFeedBootstrap({
        ...feedQueryBodyRef.current,
        cursor: 0,
        refresh: options?.refresh,
      });

      if (generation !== fetchGeneration.current) return;

      setFeedItems(page.items);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
      setCounts(counts);
    } catch (err) {
      if (generation !== fetchGeneration.current) return;
      const message = err instanceof Error ? err.message : "Couldn't load listings";
      setFeedLoadError(message);
      toast.error(message);
      setFeedItems([]);
      setTotal(0);
      setNextCursor(null);
      setCounts(EMPTY_COUNTS);
    } finally {
      if (generation === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reloadFeed({ refresh: pendingRefresh.current });
    pendingRefresh.current = false;
    // feedReloadKey is the sole trigger — reloadFeed stays stable via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedReloadKey, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || nextCursor == null) return;

    setLoadingMore(true);
    const generation = fetchGeneration.current;

    try {
      const page = await postFeedPage({
        ...feedQueryBodyRef.current,
        cursor: nextCursor,
      });

      if (generation !== fetchGeneration.current) return;

      setFeedItems((current) => {
        const seenIds = new Set(current.map((item) => item.listing.id));
        const merged = [...current];
        for (const item of page.items) {
          if (!seenIds.has(item.listing.id)) merged.push(item);
        }
        return merged;
      });
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    } catch {
      toast.error("Couldn't load more listings");
    } finally {
      if (generation === fetchGeneration.current) {
        setLoadingMore(false);
      }
    }
  }, [loading, loadingMore, nextCursor]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || nextCursor == null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  useEffect(() => {
    if (!selectedListingId) {
      setDetailListing(null);
      setDetailMatch(null);
      return;
    }

    let cancelled = false;

    void fetch(`/api/listings/${encodeURIComponent(selectedListingId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hunts }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("detail failed");
        return res.json() as Promise<{
          listing: AppListing;
          match: HuntMatchResult | null;
        }>;
      })
      .then((detail) => {
        if (cancelled) return;
        setDetailListing(detail.listing);
        setDetailMatch(detail.match);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = feedItems.find(
          (item) => item.listing.id === selectedListingId
        );
        if (fallback) {
          setDetailListing(fallback.listing);
          setDetailMatch(fallback.match);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedListingId, hunts, feedItems]);

  useEffect(() => {
    if (
      selectedListingId &&
      !feedItems.some((item) => item.listing.id === selectedListingId)
    ) {
      setSelectedListingId(null);
    }
  }, [feedItems, selectedListingId]);

  const handleAddFeedAttributeFilter = useCallback(
    (key: AttrKey, value: string) => {
      addAttributeLibraryOption(key, value);
      if (!isAttributeValueSelected(feedAttributeFilters[key], value)) {
        toggleFeedAttributeFilter(key, value);
      }
    },
    [addAttributeLibraryOption, feedAttributeFilters, toggleFeedAttributeFilter]
  );

  const removeFeedItem = useCallback((id: string) => {
    setFeedItems((current) => current.filter((item) => item.listing.id !== id));
    setTotal((current) => Math.max(0, current - 1));
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      const wasUnseen = !seenSet.has(id);
      dismissListing(id);
      removeFeedItem(id);
      setCounts((current) => ({
        ...current,
        dismissed: current.dismissed + 1,
        new: wasUnseen ? Math.max(0, current.new - 1) : current.new,
        all: Math.max(0, current.all - 1),
      }));
      toast("Dismissed", {
        action: {
          label: "Undo",
          onClick: () => {
            restoreListing(id);
            setCounts((current) => ({
              ...current,
              dismissed: Math.max(0, current.dismissed - 1),
              new: wasUnseen ? current.new + 1 : current.new,
              all: current.all + 1,
            }));
          },
        },
      });
    },
    [dismissListing, removeFeedItem, restoreListing, seenSet]
  );

  const handleDismissStarred = useCallback(
    (id: string) => {
      if (listingStatus[id]?.interested) {
        toggleInterested(id);
      }
      dismissListing(id);
      removeFeedItem(id);
      toast("Dismissed", {
        action: {
          label: "Undo",
          onClick: () => restoreListing(id),
        },
      });
    },
    [dismissListing, listingStatus, removeFeedItem, restoreListing, toggleInterested]
  );

  const handleToggleInterested = useCallback(
    (id: string) => {
      if (!seenSet.has(id)) {
        markListingSeen(id);
        setCounts((current) => ({
          ...current,
          new: Math.max(0, current.new - 1),
        }));
      }
      const wasInterested = listingStatus[id]?.interested ?? false;
      toggleInterested(id);
      if (feedView === "starred" && wasInterested) {
        removeFeedItem(id);
        toast("Removed from saved", {
          action: {
            label: "Undo",
            onClick: () => toggleInterested(id),
          },
        });
      } else {
        setCounts((current) => ({
          ...current,
          starred: wasInterested
            ? Math.max(0, current.starred - 1)
            : current.starred + 1,
        }));
      }
    },
    [feedView, listingStatus, markListingSeen, removeFeedItem, seenSet, toggleInterested]
  );

  const handleRefresh = useCallback(() => {
    pendingRefresh.current = true;
    setRefreshKey((current) => current + 1);
    toast("Checking for new listings…");
  }, []);

  const selectedIndex = useMemo(
    () => feedItems.findIndex((item) => item.listing.id === selectedListingId),
    [feedItems, selectedListingId]
  );

  const handleSelectListing = useCallback(
    (id: string) => {
      if (!seenSet.has(id)) {
        markListingSeen(id);
        setCounts((current) => ({
          ...current,
          new: Math.max(0, current.new - 1),
        }));
      }
      setSelectedListingId((current) => (current === id ? null : id));
    },
    [markListingSeen, seenSet]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedListingId(null);
  }, []);

  const handlePreviousListing = useCallback(() => {
    if (selectedIndex <= 0) return;
    setSelectedListingId(feedItems[selectedIndex - 1]?.listing.id ?? null);
  }, [feedItems, selectedIndex]);

  const handleNextListing = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= feedItems.length - 1) return;
    setSelectedListingId(feedItems[selectedIndex + 1]?.listing.id ?? null);
  }, [feedItems, selectedIndex]);

  const handleDismissAll = useCallback(async () => {
    try {
      const ids = await postFeedIds({
        ...feedQueryBody,
        feedView: "new",
        alertScope,
        marketplaceFilter,
        unseenOnly: true,
      });
      if (ids.length === 0) return;
      dismissAllUnseen(ids);
      setFeedItems([]);
      setTotal(0);
      setNextCursor(null);
      toast(`Dismissed ${ids.length.toLocaleString()} listing${ids.length === 1 ? "" : "s"}`, {
        action: {
          label: "Undo",
          onClick: () => restoreAll(ids),
        },
      });
      void postFeedCounts(feedQueryBodyRef.current).then(setCounts).catch(() => {});
    } catch {
      toast.error("Couldn't dismiss all listings");
    }
  }, [
    alertScope,
    dismissAllUnseen,
    feedQueryBody,
    marketplaceFilter,
    restoreAll,
  ]);

  const emptyMessage = useMemo(() => {
    if (feedLoadError) {
      return {
        title: "Couldn't load listings",
        hint: feedLoadError,
      };
    }

    if (
      counts.all === 0 &&
      (feedView === "new" || feedView === "all")
    ) {
      const filterHint = hasActiveFeedAttributeFilters(feedAttributeFilters)
        ? "Try Clear all in the sidebar to reset attribute filters, or adjust condition filters on Hunt Preferences."
        : "Try Clear all in the sidebar, or reset condition filters on Hunt Preferences.";
      return {
        title: "Your filters are blocking all listings",
        hint: filterHint,
      };
    }

    if (feedView === "starred") {
      return {
        title: "No saved listings yet",
        hint: "Save listings from New — unsave or dismiss them here.",
      };
    }

    if (feedView === "dismissed") {
      return { title: "Nothing dismissed", hint: "Listings you dismiss will appear here." };
    }

    if (alertScope.startsWith("hunt:")) {
      return {
        title: "No matches for this hunt",
        hint:
          counts.all > 0
            ? "Nothing unseen matches this hunt — try All hunts, raise your max total cost on Hunt Preferences, or broaden criteria on Hunts."
            : "Nothing unseen matches this hunt — try All hunts or broaden criteria on Hunts.",
      };
    }

    if (alertScope === "watchlist") {
      return {
        title: "No hunt matches yet",
        hint:
          activeHunts.length === 0
            ? "Save a hunt on Hunts to populate Hunt Finds."
            : counts.all > 0
              ? "Listings are available, but none match your hunts in this view — try All listings, raise your max total cost on Hunt Preferences, or broaden hunt criteria."
              : "Nothing unseen matches your saved hunts — try All listings or broaden hunt criteria.",
      };
    }

    if (feedView === "all") {
      return {
        title: "No listings in this view",
        hint: "Nothing matches your filters — try clearing filters or refreshing.",
      };
    }

    return {
      title: "No listings match",
      hint: "Nothing matches this view — try refreshing or widening your scope.",
    };
  }, [
    feedLoadError,
    counts.all,
    feedView,
    alertScope,
    activeHunts.length,
    feedAttributeFilters,
  ]);

  const contextSuffix = feedContextSuffix(
    feedView,
    alertScope,
    marketplaceFilter,
    activeHunts,
    counts.new
  );

  const showDetailPanel = selectedListingId != null && detailListing != null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          GoodFinds
        </h1>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="shrink-0">
          Check for new listings
        </Button>
      </div>

      {!ebayEnabled && (
        <p className="font-mono-data text-xs text-ink-soft">
          eBay offline — add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to .env.local, run{" "}
          <code className="text-ink">npm run sync:ebay</code>, then restart.
        </p>
      )}

      <div className="relative min-h-0">
        <div
          className={cn(
            "grid min-h-0 grid-cols-1 items-start gap-6 md:gap-8",
            showDetailPanel
              ? "md:grid-cols-[minmax(0,1fr)_26rem]"
              : "md:grid-cols-[minmax(0,1fr)_17.5rem]"
          )}
        >
          {!showDetailPanel && (
            <FeedSidebar
              feedView={feedView}
              alertScope={alertScope}
              marketplaceFilter={marketplaceFilter}
              feedAttributeFilters={feedAttributeFilters}
              attributeLibrary={attributeLibrary}
              counts={counts}
              onFeedViewChange={setFeedView}
              onScopeChange={setAlertScope}
              onMarketplaceChange={setMarketplaceFilter}
              onToggleFeedAttributeFilter={toggleFeedAttributeFilter}
              onAddFeedAttributeFilter={handleAddFeedAttributeFilter}
              onClearFeedAttributeFilters={clearFeedAttributeFilters}
              className="md:col-start-2 md:row-start-1"
            />
          )}

          <div
            className={cn(
              "relative min-w-0 space-y-4 md:col-start-1 md:row-start-1",
              showDetailPanel && "max-md:mr-[min(100%,24rem)]"
            )}
          >
            {(feedView === "new" || feedView === "all") && (
              <HuntQuickFilter
                activeHunts={activeHunts}
                alertScope={alertScope}
                counts={counts}
                onScopeChange={setAlertScope}
              />
            )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono-data text-sm text-ink-soft">
              <span className="mr-1.5 inline-block rounded-sm bg-paper px-1.5 py-0.5 font-medium text-ink">
                {total.toLocaleString()}
              </span>
              {contextSuffix}
            </p>
            {feedView === "new" && counts.new > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDismissAll()}
                className="shrink-0 text-ink-soft hover:text-ink"
              >
                Dismiss all
              </Button>
            )}
          </div>

          {loading ? (
            <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-ink">Loading listings…</p>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-ink">{emptyMessage.title}</p>
              <p className="mt-2 text-sm text-ink-soft">{emptyMessage.hint}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {feedItems.map(({ listing, match }) => (
                  <AlertListingCard
                    key={listing.id}
                    compact
                    listing={listing}
                    match={match ?? undefined}
                    interested={listingStatus[listing.id]?.interested}
                    isNew={
                      (feedView === "new" || feedView === "all") &&
                      !seenSet.has(listing.id)
                    }
                    muted={feedView === "dismissed"}
                    selected={selectedListingId === listing.id}
                    onSelect={() => handleSelectListing(listing.id)}
                    onDismiss={
                      feedView === "new" || feedView === "all"
                        ? () => handleDismiss(listing.id)
                        : feedView === "starred"
                          ? () => handleDismissStarred(listing.id)
                          : undefined
                    }
                    onRestore={
                      feedView === "dismissed"
                        ? () => {
                            restoreListing(listing.id);
                            toast("Restored to feed");
                          }
                        : undefined
                    }
                    onToggleInterested={() => handleToggleInterested(listing.id)}
                  />
                ))}
              </div>

              {nextCursor != null && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-6 text-sm text-ink-soft"
                >
                  {loadingMore ? "Loading more…" : "Scroll for more"}
                </div>
              )}
            </>
            )}
          </div>

          {showDetailPanel && detailListing && (
            <ListingDetailPanel
              listing={detailListing}
              match={detailMatch ?? undefined}
              interested={listingStatus[detailListing.id]?.interested}
              positionLabel={
                selectedIndex >= 0
                  ? `${selectedIndex + 1} of ${total.toLocaleString()}`
                  : undefined
              }
              onClose={handleCloseDetail}
              onPrevious={selectedIndex > 0 ? handlePreviousListing : undefined}
              onNext={
                selectedIndex >= 0 && selectedIndex < feedItems.length - 1
                  ? handleNextListing
                  : undefined
              }
              onToggleInterested={() => handleToggleInterested(detailListing.id)}
              onDismiss={
                feedView === "new" || feedView === "all"
                  ? () => {
                      handleDismiss(detailListing.id);
                      handleCloseDetail();
                    }
                  : feedView === "starred"
                    ? () => {
                        handleDismissStarred(detailListing.id);
                        handleCloseDetail();
                      }
                    : undefined
              }
              className="max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:w-full max-md:max-w-sm max-md:shadow-sm md:sticky md:top-4 md:col-start-2 md:row-start-1 md:self-start"
            />
          )}
        </div>
      </div>
    </div>
  );
}
