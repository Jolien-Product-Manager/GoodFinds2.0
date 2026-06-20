"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertListingCard } from "@/components/alert-listing-card";
import { FeedSidebar } from "@/components/feed-sidebar";
import type { AppListing, AlertScope } from "@/lib/listings/types";
import { huntHasActiveCriteria, matchAllHunts } from "@/lib/listings/hunt-match";
import {
  alertListings,
  alertSort,
  dismissedListings,
  interestedListings,
  unseenListings,
} from "@/lib/listings/selectors";
import { useCasebackStore, type FeedView } from "@/store/caseback";

interface FeedViewProps {
  listings: AppListing[];
  ebayEnabled: boolean;
}

function feedContextSuffix(
  feedView: FeedView,
  alertScope: AlertScope,
  activeHunts: { id: string; name: string }[]
): string {
  if (feedView === "starred") return "starred";
  if (feedView === "dismissed") return "dismissed";
  if (alertScope === "top") return "new · top matches";
  if (alertScope.startsWith("hunt:")) {
    const huntId = alertScope.slice(5);
    const hunt = activeHunts.find((h) => h.id === huntId);
    return `new · matching ${hunt?.name ?? "this hunt"}`;
  }
  if (alertScope === "watchlist") return "new · matching any of your hunts";
  return "new";
}

export function FeedView({ listings, ebayEnabled }: FeedViewProps) {
  const router = useRouter();

  const seen = useCasebackStore((s) => s.seen);
  const listingStatus = useCasebackStore((s) => s.listingStatus);
  const alertScope = useCasebackStore((s) => s.alertScope);
  const feedView = useCasebackStore((s) => s.feedView);
  const criteria = useCasebackStore((s) => s.criteria);
  const hunts = useCasebackStore((s) => s.hunts);
  const globalFilters = useCasebackStore((s) => s.globalFilters);
  const hiddenListings = useCasebackStore((s) => s.hiddenListings);
  const dislikedModels = useCasebackStore((s) => s.dislikedModels);

  const dismissListing = useCasebackStore((s) => s.dismissListing);
  const restoreListing = useCasebackStore((s) => s.restoreListing);
  const toggleInterested = useCasebackStore((s) => s.toggleInterested);
  const setAlertScope = useCasebackStore((s) => s.setAlertScope);
  const setFeedView = useCasebackStore((s) => s.setFeedView);

  const ctx = useMemo(
    () => ({
      seen,
      listingStatus,
      hiddenListings,
      dislikedModels,
      criteria,
    }),
    [seen, listingStatus, hiddenListings, dislikedModels, criteria]
  );

  const matchResults = useMemo(
    () => matchAllHunts(listings, hunts, globalFilters),
    [listings, hunts, globalFilters]
  );

  const ctxWithMatches = useMemo(
    () => ({ ...ctx, matchResults, hunts }),
    [ctx, matchResults, hunts]
  );

  const newListings = useMemo(
    () => alertSort(alertListings(listings, alertScope, ctxWithMatches), ctxWithMatches),
    [listings, alertScope, ctxWithMatches]
  );

  const starred = useMemo(
    () => interestedListings(listings, ctx),
    [listings, ctx]
  );

  const dismissed = useMemo(
    () => dismissedListings(listings, ctx),
    [listings, ctx]
  );

  const unseenAll = useMemo(
    () => unseenListings(listings, ctx),
    [listings, ctx]
  );

  const activeHunts = useMemo(
    () => hunts.filter((h) => h.saved && huntHasActiveCriteria(h)),
    [hunts]
  );

  const sidebarCounts = useMemo(() => {
    const perHunt: Record<string, number> = {};
    for (const hunt of activeHunts) {
      perHunt[hunt.id] = alertListings(
        listings,
        `hunt:${hunt.id}` as AlertScope,
        ctxWithMatches
      ).length;
    }
    return {
      new: unseenAll.length,
      starred: starred.length,
      dismissed: dismissed.length,
      top: alertListings(listings, "top", ctxWithMatches).length,
      huntMatches: alertListings(listings, "watchlist", ctxWithMatches).length,
      perHunt,
    };
  }, [listings, ctxWithMatches, unseenAll.length, starred.length, dismissed.length, activeHunts]);

  const isHuntFindsScope =
    alertScope === "watchlist" || alertScope.startsWith("hunt:");

  const handleDismiss = useCallback(
    (id: string) => {
      dismissListing(id);
      toast("Dismissed", {
        action: {
          label: "Undo",
          onClick: () => restoreListing(id),
        },
      });
    },
    [dismissListing, restoreListing]
  );

  const handleRefresh = useCallback(() => {
    router.refresh();
    toast("Checking for new listings…");
  }, [router]);

  const displayListings =
    feedView === "starred"
      ? starred
      : feedView === "dismissed"
        ? dismissed
        : newListings;

  const emptyMessage =
    feedView === "starred"
      ? { title: "No starred listings yet", hint: "Star listings from New to save them here." }
      : feedView === "dismissed"
        ? { title: "Nothing dismissed", hint: "Listings you dismiss will appear here." }
        : alertScope.startsWith("hunt:")
          ? {
              title: "No matches for this hunt",
              hint: "Nothing unseen matches this hunt — try All hunts or broaden criteria on Hunts.",
            }
          : alertScope === "watchlist"
            ? {
                title: "No hunt matches yet",
                hint:
                  activeHunts.length === 0
                    ? "Save a hunt on Hunts to populate Hunt matches."
                    : "Nothing unseen matches your saved hunts — try Top matches, or broaden hunt criteria.",
              }
            : alertScope === "top"
              ? {
                  title: "No top matches yet",
                  hint: "Top matches need a feed score of 4.0 or higher from a saved hunt.",
                }
              : {
                  title: "You're all caught up",
                  hint: "Nothing new in this view — try refreshing or widening your scope.",
                };

  const contextSuffix = feedContextSuffix(feedView, alertScope, activeHunts);

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
          eBay offline — save EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env.local, then restart
          npm
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_17.5rem] md:gap-8">
        <FeedSidebar
          feedView={feedView}
          alertScope={alertScope}
          counts={sidebarCounts}
          activeHunts={activeHunts}
          onFeedViewChange={setFeedView}
          onScopeChange={setAlertScope}
          className="md:sticky md:top-4 md:col-start-2 md:row-start-1"
        />

        <div className="min-w-0 space-y-4 md:col-start-1 md:row-start-1">
          <p className="font-mono-data text-sm text-ink-soft">
            <span className="mr-1.5 inline-block rounded-sm bg-paper px-1.5 py-0.5 font-medium text-ink">
              {displayListings.length.toLocaleString()}
            </span>
            {contextSuffix}
          </p>

          {displayListings.length === 0 ? (
            <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
              <p className="font-display text-lg text-ink">{emptyMessage.title}</p>
              <p className="mt-2 text-sm text-ink-soft">{emptyMessage.hint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {displayListings.map((listing) => (
                <AlertListingCard
                  key={listing.id}
                  compact
                  listing={listing}
                  match={matchResults.get(listing.id)}
                  interested={listingStatus[listing.id]?.interested}
                  muted={feedView === "dismissed"}
                  showHuntMatchTags={feedView === "new" && isHuntFindsScope}
                  onDismiss={
                    feedView === "new" ? () => handleDismiss(listing.id) : undefined
                  }
                  onRestore={
                    feedView === "dismissed"
                      ? () => {
                          restoreListing(listing.id);
                          toast("Restored to New");
                        }
                      : undefined
                  }
                  onToggleInterested={() => toggleInterested(listing.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
