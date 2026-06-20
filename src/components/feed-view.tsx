"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useCasebackStore } from "@/store/caseback";
import { cn } from "@/lib/utils";

interface FeedViewProps {
  listings: AppListing[];
  ebayEnabled: boolean;
}

export function FeedView({ listings, ebayEnabled }: FeedViewProps) {
  const router = useRouter();
  const [dismissedOpen, setDismissedOpen] = useState(true);

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

  const interested = useMemo(
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

  const scopeChips: { id: AlertScope; label: string }[] = [
    { id: "all", label: "All new" },
    { id: "watchlist", label: "Watch-list" },
    { id: "top", label: "Top matches" },
    ...hunts
      .filter((h) => h.saved)
      .map((h) => ({ id: `hunt:${h.id}` as AlertScope, label: h.name })),
  ];

  const displayListings = feedView === "interested" ? interested : newListings;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Vintage Timex Watches Feed
          </h1>
          <p className="mt-1 text-ink-soft">
            Listings you haven&apos;t dismissed — scan, star, and clear noise.
          </p>
          <p className="mt-2 font-mono-data text-xs text-ink-soft">
            {unseenCount} new · {dismissed.length} dismissed
            {!ebayEnabled && " · eBay offline (Chrono24 only)"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-sm border border-line-strong p-0.5">
            {(["new", "interested"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setFeedView(view)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm capitalize",
                  feedView === view
                    ? "bg-ink text-card"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {feedView === "new" &&
            scopeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setAlertScope(chip.id)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-sm",
                  alertScope === chip.id
                    ? "border-brass bg-brass/10 text-ink"
                    : "border-line-strong text-ink-soft hover:text-ink"
                )}
              >
                {chip.label}
              </button>
            ))}
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
          <p className="font-display text-lg text-ink">
            {feedView === "interested"
              ? "No starred listings yet"
              : "You're all caught up"}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {feedView === "interested"
              ? "Star listings from New to save them here."
              : "Nothing new in this view — try refreshing or widening your scope."}
          </p>
        </div>
      ) : (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl font-medium capitalize text-ink">
              {feedView}
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
                onDismiss={
                  feedView === "new"
                    ? () => handleDismiss(listing.id)
                    : undefined
                }
                onToggleInterested={() => toggleInterested(listing.id)}
              />
            ))}
          </div>
        </section>
      )}

      {feedView === "new" && dismissed.length > 0 && (
        <Collapsible open={dismissedOpen} onOpenChange={setDismissedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-sm border border-line-strong bg-card/50 px-4 py-3 text-left"
            >
              <span className="font-display text-lg text-ink-soft">
                Dismissed listings
              </span>
              <Badge variant="outline">{dismissed.length}</Badge>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dismissed.map((listing) => (
                <AlertListingCard
                  key={listing.id}
                  listing={listing}
                  match={matchResults.get(listing.id)}
                  muted
                  onRestore={() => {
                    restoreListing(listing.id);
                    toast("Restored to New");
                  }}
                  onToggleInterested={() => toggleInterested(listing.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
