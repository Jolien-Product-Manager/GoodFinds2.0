"use client";

import Link from "next/link";
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
import type { AppListing, MarketplaceFilter, MatchQualityLevel } from "@/lib/listings/types";
import { hasHuntFindsFilters } from "@/lib/listings/hunt-finds-filter";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";
import { huntHasActiveCriteria } from "@/lib/listings/hunt-match";
import { hasCustomGlobalFilters } from "@/components/feed-global-filters";
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
  matchQuality: { perfect: 0, close: 0, loose: 0 },
  marketplace: { all: 0, ebay: 0, chrono24: 0, etsy: 0 },
};

function feedContextSuffix(
  feedView: FeedView,
  selectedHuntIds: string[],
  selectedMatchQualities: MatchQualityLevel[],
  marketplaceFilter: MarketplaceFilter,
  activeHunts: { id: string; name: string }[],
  newCount?: number
): string {
  const huntLabel = (() => {
    if (selectedHuntIds.length === 0) return null;
    if (
      activeHunts.length > 0 &&
      selectedHuntIds.length === activeHunts.length
    ) {
      return "matching any of your hunts";
    }
    const names = selectedHuntIds
      .map((id) => activeHunts.find((h) => h.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 1) return `matching ${names[0]}`;
    if (names.length > 0) return `matching ${names.length} hunts`;
    return "matching selected hunts";
  })();

  const qualityLabel = (() => {
    if (selectedMatchQualities.length === 0) return null;
    const labels = selectedMatchQualities.map((quality) => {
      if (quality === "perfect") return "perfect";
      if (quality === "close") return "good";
      return "loose";
    });
    return `· ${labels.join(" + ")} finds`;
  })();

  const filterSuffix = [huntLabel, qualityLabel].filter(Boolean).join(" ");

  if (feedView === "starred") return "saved";
  if (feedView === "dismissed") return "dismissed";
  if (feedView === "all") {
    let suffix = filterSuffix ? `all listings · ${filterSuffix}` : "all listings";
    if (marketplaceFilter === "ebay") suffix += " · eBay";
    else if (marketplaceFilter === "chrono24") suffix += " · Chrono24";
    else if (marketplaceFilter === "etsy") suffix += " · Etsy";
    return suffix;
  }

  let suffix =
    newCount != null && newCount > 0
      ? `listings · ${newCount.toLocaleString()} new`
      : "listings";
  if (filterSuffix) suffix += ` · ${filterSuffix}`;

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
  const selectedHuntIds = useCasebackStore((s) => s.selectedHuntIds);
  const selectedMatchQualities = useCasebackStore((s) => s.selectedMatchQualities);
  const marketplaceFilter = useCasebackStore((s) => s.marketplaceFilter);
  const feedView = useCasebackStore((s) => s.feedView);
  const criteria = useCasebackStore((s) => s.criteria);
  const hunts = useCasebackStore((s) => s.hunts);
  const hiddenListings = useCasebackStore((s) => s.hiddenListings);
  const dislikedModels = useCasebackStore((s) => s.dislikedModels);
  const feedAttributeFilters = useCasebackStore((s) => s.feedAttributeFilters);
  const globalFilters = useCasebackStore((s) => s.globalFilters);
  const savedGlobalFilters = useCasebackStore((s) => s.savedGlobalFilters);
  const attributeLibrary = useCasebackStore((s) => s.attributeLibrary ?? {});

  const dismissListing = useCasebackStore((s) => s.dismissListing);
  const dismissAllUnseen = useCasebackStore((s) => s.dismissAllUnseen);
  const restoreListing = useCasebackStore((s) => s.restoreListing);
  const markListingSeen = useCasebackStore((s) => s.markListingSeen);
  const restoreAll = useCasebackStore((s) => s.restoreAll);
  const toggleInterested = useCasebackStore((s) => s.toggleInterested);
  const toggleSelectedHunt = useCasebackStore((s) => s.toggleSelectedHunt);
  const toggleAllSelectedHunts = useCasebackStore((s) => s.toggleAllSelectedHunts);
  const toggleSelectedMatchQuality = useCasebackStore((s) => s.toggleSelectedMatchQuality);
  const clearHuntFindsFilters = useCasebackStore((s) => s.clearHuntFindsFilters);
  const setMarketplaceFilter = useCasebackStore((s) => s.setMarketplaceFilter);
  const setFeedView = useCasebackStore((s) => s.setFeedView);
  const toggleFeedAttributeFilter = useCasebackStore((s) => s.toggleFeedAttributeFilter);
  const clearFeedAttributeFilters = useCasebackStore((s) => s.clearFeedAttributeFilters);
  const setGlobalFilters = useCasebackStore((s) => s.setGlobalFilters);
  const resetGlobalFiltersToSaved = useCasebackStore((s) => s.resetGlobalFiltersToSaved);
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
      selectedHuntIds,
      selectedMatchQualities,
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
      selectedHuntIds,
      selectedMatchQualities,
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
        selectedHuntIds,
        selectedMatchQualities,
        marketplaceFilter,
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
      selectedHuntIds,
      selectedMatchQualities,
      marketplaceFilter,
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

  const womensOnlyHunts =
    activeHunts.length > 0 && activeHunts.every((h) => h.gender === "womens");

  const showAllListings = useCallback(() => {
    setFeedView("new");
    clearHuntFindsFilters();
    setMarketplaceFilter("all");
    clearFeedAttributeFilters();
    resetGlobalFiltersToSaved();
  }, [
    clearFeedAttributeFilters,
    clearHuntFindsFilters,
    resetGlobalFiltersToSaved,
    setFeedView,
    setMarketplaceFilter,
  ]);

  const hasActiveFilters = useMemo(
    () =>
      hasHuntFindsFilters(selectedHuntIds, selectedMatchQualities) ||
      marketplaceFilter !== "all" ||
      hasActiveFeedAttributeFilters(feedAttributeFilters) ||
      hasCustomGlobalFilters(globalFilters, savedGlobalFilters),
    [
      selectedHuntIds,
      selectedMatchQualities,
      marketplaceFilter,
      feedAttributeFilters,
      globalFilters,
      savedGlobalFilters,
    ]
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

  const reinsertFeedItem = useCallback((item: FeedItem, index: number) => {
    setFeedItems((current) => {
      if (current.some((entry) => entry.listing.id === item.listing.id)) return current;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
    setTotal((current) => current + 1);
  }, []);

  const handleDismiss = useCallback(
    (id: string) => {
      const wasUnseen = !seenSet.has(id);
      const removedIndex = feedItems.findIndex((item) => item.listing.id === id);
      const removedItem = removedIndex >= 0 ? feedItems[removedIndex] : null;
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
            if (removedItem) {
              reinsertFeedItem(removedItem, removedIndex);
            }
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
    [dismissListing, feedItems, reinsertFeedItem, removeFeedItem, restoreListing, seenSet]
  );

  const handleDismissStarred = useCallback(
    (id: string) => {
      const wasInterested = listingStatus[id]?.interested ?? false;
      const removedIndex = feedItems.findIndex((item) => item.listing.id === id);
      const removedItem = removedIndex >= 0 ? feedItems[removedIndex] : null;
      if (wasInterested) {
        toggleInterested(id);
      }
      dismissListing(id);
      removeFeedItem(id);
      toast("Dismissed", {
        action: {
          label: "Undo",
          onClick: () => {
            restoreListing(id);
            if (removedItem) {
              reinsertFeedItem(removedItem, removedIndex);
            }
            if (wasInterested) {
              toggleInterested(id);
            }
          },
        },
      });
    },
    [
      dismissListing,
      feedItems,
      listingStatus,
      reinsertFeedItem,
      removeFeedItem,
      restoreListing,
      toggleInterested,
    ]
  );

  const handleRestore = useCallback(
    (id: string) => {
      restoreListing(id);
      removeFeedItem(id);
      setCounts((current) => ({
        ...current,
        dismissed: Math.max(0, current.dismissed - 1),
        all: current.all + 1,
      }));
      toast("Restored to feed");
    },
    [removeFeedItem, restoreListing]
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
        unseenOnly: true,
      });
      if (ids.length === 0) return;
      const previousItems = feedItems;
      const previousTotal = total;
      const previousCursor = nextCursor;
      dismissAllUnseen(ids);
      setFeedItems([]);
      setTotal(0);
      setNextCursor(null);
      toast(`Dismissed ${ids.length.toLocaleString()} listing${ids.length === 1 ? "" : "s"}`, {
        action: {
          label: "Undo",
          onClick: () => {
            restoreAll(ids);
            setFeedItems(previousItems);
            setTotal(previousTotal);
            setNextCursor(previousCursor);
          },
        },
      });
      void postFeedCounts(feedQueryBodyRef.current).then(setCounts).catch(() => {});
    } catch {
      toast.error("Couldn't dismiss all listings");
    }
  }, [
    dismissAllUnseen,
    feedItems,
    feedQueryBody,
    nextCursor,
    restoreAll,
    total,
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

    if (selectedHuntIds.length === 1) {
      return {
        title: "No matches for this hunt",
        hint:
          counts.all > 0
            ? "Nothing unseen matches this hunt — try All hunts, raise your max total cost on Hunt Preferences, or broaden criteria on Hunts."
            : "Nothing unseen matches this hunt — try All hunts or broaden criteria on Hunts.",
      };
    }

    if (selectedHuntIds.length > 0 || selectedMatchQualities.length > 0) {
      let hint =
        activeHunts.length === 0
          ? "Save a hunt on Hunts to populate Hunt Finds."
          : counts.all > 0
            ? "Listings are available, but none match your hunts in this view — try Show all listings below, raise your max total cost on Hunt Preferences, or broaden hunt criteria."
            : "Nothing unseen matches your saved hunts — try All listings or broaden hunt criteria.";
      if (womensOnlyHunts && counts.all > 0) {
        hint +=
          " Your hunts are set to Women's only — most vintage Timex listings read as men's or unisex, so try Both or Men's on Hunts.";
      }
      return {
        title: "No hunt matches yet",
        hint,
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
    selectedHuntIds,
    selectedMatchQualities,
    activeHunts.length,
    feedAttributeFilters,
    womensOnlyHunts,
  ]);

  const contextSuffix = feedContextSuffix(
    feedView,
    selectedHuntIds,
    selectedMatchQualities,
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
              selectedHuntIds={selectedHuntIds}
              selectedMatchQualities={selectedMatchQualities}
              marketplaceFilter={marketplaceFilter}
              feedAttributeFilters={feedAttributeFilters}
              globalFilters={globalFilters}
              savedGlobalFilters={savedGlobalFilters}
              attributeLibrary={attributeLibrary}
              counts={counts}
              onFeedViewChange={setFeedView}
              onClearHuntFindsFilters={clearHuntFindsFilters}
              onMarketplaceChange={setMarketplaceFilter}
              onToggleFeedAttributeFilter={toggleFeedAttributeFilter}
              onAddFeedAttributeFilter={handleAddFeedAttributeFilter}
              onClearFeedAttributeFilters={clearFeedAttributeFilters}
              onGlobalFiltersChange={setGlobalFilters}
              onResetGlobalFilters={resetGlobalFiltersToSaved}
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
                selectedHuntIds={selectedHuntIds}
                selectedMatchQualities={selectedMatchQualities}
                counts={counts}
                onToggleAllHunts={() =>
                  toggleAllSelectedHunts(activeHunts.map((hunt) => hunt.id))
                }
                onToggleHunt={toggleSelectedHunt}
                onToggleMatchQuality={toggleSelectedMatchQuality}
                onClearFilters={clearHuntFindsFilters}
              />
            )}

          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 font-mono-data text-sm text-ink-soft">
              <span className="mr-1.5 inline-block rounded-sm bg-paper px-1.5 py-0.5 font-medium text-ink">
                {total.toLocaleString()}
              </span>
              {contextSuffix}
              {total === 0 &&
                counts.all > 0 &&
                hasHuntFindsFilters(selectedHuntIds, selectedMatchQualities) &&
                (feedView === "new" || feedView === "all") && (
                  <span className="text-ink-soft">
                    {" "}
                    · {counts.all.toLocaleString()} pass your filters
                  </span>
                )}
            </p>
            <div className="flex shrink-0 items-center gap-2">
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
              {(feedView === "new" || feedView === "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={showAllListings}
                  disabled={!hasActiveFilters}
                  className="shrink-0 text-ink-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-ink">Loading listings…</p>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-ink">{emptyMessage.title}</p>
              <p className="mt-2 text-sm text-ink-soft">{emptyMessage.hint}</p>
              {counts.all > 0 &&
                hasHuntFindsFilters(selectedHuntIds, selectedMatchQualities) && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={showAllListings}>
                    Show all listings
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/hunts">Edit hunts</Link>
                  </Button>
                </div>
              )}
              {counts.all === 0 && (feedView === "new" || feedView === "all") && (
                <div className="mt-5">
                  <Button type="button" variant="outline" onClick={showAllListings}>
                    Clear filters and show all
                  </Button>
                </div>
              )}
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
                        ? () => handleRestore(listing.id)
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
