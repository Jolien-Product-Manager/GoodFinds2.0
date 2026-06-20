"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertListingCard } from "@/components/alert-listing-card";
import type { AppListing, AlertScope } from "@/lib/listings/types";
import { matchAllHunts } from "@/lib/listings/hunt-match";
import {
  alertListings,
  alertSort,
  dismissedListings,
  interestedListings,
  unseenListings,
} from "@/lib/listings/selectors";
import { useCasebackStore, type FeedView } from "@/store/caseback";
import { cn } from "@/lib/utils";

interface FeedViewProps {
  listings: AppListing[];
  ebayEnabled: boolean;
}

const MAIN_VIEWS: { id: FeedView; label: string }[] = [
  { id: "new", label: "New" },
  { id: "starred", label: "Starred" },
  { id: "dismissed", label: "Dismissed" },
];

const NEW_SCOPES: { id: AlertScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "watchlist", label: "Watch-list" },
];

export function FeedView({ listings, ebayEnabled }: FeedViewProps) {
  const router = useRouter();

  const seen = useCasebackStore((s) => s.seen);
  const listingStatus = useCasebackStore((s) => s.listingStatus);
  const alertScope = useCasebackStore((s) => s.alertScope);
  const feedView = useCasebackStore((s) => s.feedView);
  const modelHearts = useCasebackStore((s) => s.modelHearts);
  const criteria = useCasebackStore((s) => s.criteria);
  const hunts = useCasebackStore((s) => s.hunts);
  const globalFilters = useCasebackStore((s) => s.globalFilters);
  const hiddenListings = useCasebackStore((s) => s.hiddenListings);
  const dislikedModels = useCasebackStore((s) => s.dislikedModels);

  const dismissListing = useCasebackStore((s) => s.dismissListing);
  const restoreListing = useCasebackStore((s) => s.restoreListing);
  const toggleInterested = useCasebackStore((s) => s.toggleInterested);
  const dismissAllUnseen = useCasebackStore((s) => s.dismissAllUnseen);
  const restoreAll = useCasebackStore((s) => s.restoreAll);
  const setAlertScope = useCasebackStore((s) => s.setAlertScope);
  const setFeedView = useCasebackStore((s) => s.setFeedView);

  const ctx = useMemo(
    () => ({
      seen,
      listingStatus,
      hiddenListings,
      dislikedModels,
      modelHearts,
      criteria,
    }),
    [seen, listingStatus, hiddenListings, dislikedModels, modelHearts, criteria]
  );

  const matchResults = useMemo(
    () => matchAllHunts(listings, hunts, globalFilters),
    [listings, hunts, globalFilters]
  );

  const ctxWithMatches = useMemo(
    () => ({ ...ctx, matchResults }),
    [ctx, matchResults]
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

  const unseenCount = useMemo(
    () => unseenListings(listings, ctx).length,
    [listings, ctx]
  );

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

  const handleMarkAllDismissed = useCallback(() => {
    const ids = newListings.map((l) => l.id);
    if (ids.length === 0) return;
    dismissAllUnseen(ids);
    toast(`Dismissed ${ids.length} listings`, {
      action: {
        label: "Undo",
        onClick: () => restoreAll(ids),
      },
    });
  }, [newListings, dismissAllUnseen, restoreAll]);

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
        : { title: "You're all caught up", hint: "Nothing new in this view — try refreshing or widening your scope." };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">GoodFinds</h1>
          <p className="mt-2 font-mono-data text-xs text-ink-soft">
            {unseenCount} new · {starred.length} starred · {dismissed.length} dismissed
            {!ebayEnabled &&
              " · eBay offline — save EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env.local, then restart npm"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-sm border border-line-strong p-0.5">
            {MAIN_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setFeedView(view.id)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm",
                  feedView === view.id
                    ? "bg-ink text-card"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                {view.label}
              </button>
            ))}
          </div>

          {feedView === "new" && (
            <div className="inline-flex rounded-sm border border-line-strong p-0.5">
              {NEW_SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setAlertScope(scope.id)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-sm",
                    alertScope === scope.id
                      ? "border-brass bg-brass/10 text-ink"
                      : "text-ink-soft hover:text-ink"
                  )}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {feedView === "new" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllDismissed}>
              Mark all dismissed
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Check for new listings
            </Button>
          </div>
        )}
      </div>

      {displayListings.length === 0 ? (
        <div className="rounded-sm border border-dashed border-line-strong bg-card/50 p-12 text-center">
          <p className="font-display text-lg text-ink">{emptyMessage.title}</p>
          <p className="mt-2 text-sm text-ink-soft">{emptyMessage.hint}</p>
        </div>
      ) : (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl font-medium text-ink">
              {MAIN_VIEWS.find((v) => v.id === feedView)?.label}
            </h2>
            <Badge variant="outline">{displayListings.length}</Badge>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayListings.map((listing) => (
              <AlertListingCard
                key={listing.id}
                listing={listing}
                match={matchResults.get(listing.id)}
                interested={listingStatus[listing.id]?.interested}
                muted={feedView === "dismissed"}
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
        </section>
      )}
    </div>
  );
}
