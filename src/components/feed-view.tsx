"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertListingCard } from "@/components/alert-listing-card";
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
  { id: "watchlist", label: "Hunt Finds" },
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

  const activeHunts = useMemo(
    () => hunts.filter((h) => h.saved && huntHasActiveCriteria(h)),
    [hunts]
  );

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
                    ? "Save a hunt on Hunts (gender, model, era, etc.) to populate Hunt Finds."
                    : "Nothing unseen matches your saved hunts — try All, or broaden hunt criteria on Hunts.",
              }
            : { title: "You're all caught up", hint: "Nothing new in this view — try refreshing or widening your scope." };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">GoodFinds</h1>
            <p className="mt-2 font-mono-data text-xs text-ink-soft">
              {unseenCount} new · {starred.length} starred · {dismissed.length} dismissed
              {!ebayEnabled &&
                " · eBay offline — save EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env.local, then restart npm"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="shrink-0">
            Check for new listings
          </Button>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFeedView("new")}
              className={cn(
                "rounded-sm border border-line-strong px-4 py-2 text-sm transition-colors",
                feedView === "new"
                  ? "bg-ink text-card"
                  : "bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
              )}
            >
              New
            </button>

            {feedView === "new" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {NEW_SCOPES.map((scope) => {
                    const isHuntFinds = scope.id === "watchlist";
                    const isActive = isHuntFinds
                      ? isHuntFindsScope
                      : alertScope === scope.id;

                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => setAlertScope(scope.id)}
                        className={cn(
                          "rounded-sm border px-2 py-1 text-xs transition-colors",
                          isActive
                            ? "border-brass bg-brass/10 text-ink"
                            : "border-line-strong bg-card/80 text-ink-soft hover:border-ink/30 hover:text-ink"
                        )}
                      >
                        {scope.label}
                      </button>
                    );
                  })}
                </div>

                {isHuntFindsScope && activeHunts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAlertScope("watchlist")}
                      className={cn(
                        "rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
                        alertScope === "watchlist"
                          ? "border-ink bg-ink/5 text-ink"
                          : "border-line bg-card/60 text-ink-soft hover:border-ink/30 hover:text-ink"
                      )}
                    >
                      All hunts
                    </button>
                    {activeHunts.map((hunt) => {
                      const huntScope = `hunt:${hunt.id}` as AlertScope;
                      return (
                        <button
                          key={hunt.id}
                          type="button"
                          onClick={() => setAlertScope(huntScope)}
                          className={cn(
                            "rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
                            alertScope === huntScope
                              ? "border-ink bg-ink/5 text-ink"
                              : "border-line bg-card/60 text-ink-soft hover:border-ink/30 hover:text-ink"
                          )}
                        >
                          {hunt.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {MAIN_VIEWS.filter((view) => view.id !== "new").map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setFeedView(view.id)}
              className={cn(
                "rounded-sm border border-line-strong px-4 py-2 text-sm transition-colors",
                feedView === view.id
                  ? "bg-ink text-card"
                  : "bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
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
        </section>
      )}
    </div>
  );
}
