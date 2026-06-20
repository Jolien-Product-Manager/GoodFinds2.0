"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { HuntHeartsPicker } from "@/components/hunt-hearts";
import type { AlertScope, MarketplaceFilter } from "@/lib/listings/types";
import type { Hunt } from "@/lib/hunts/types";
import type { FeedView } from "@/store/caseback";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  return n.toLocaleString();
}

interface SidebarRowProps {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  indent?: boolean;
  trailing?: React.ReactNode;
  href?: string;
}

function SidebarRow({
  label,
  count,
  selected = false,
  onClick,
  indent = false,
  trailing,
  href,
}: SidebarRowProps) {
  const inner = (
    <>
      <span
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded-[2px] border",
          selected ? "border-brass bg-brass/30" : "border-line-strong bg-card"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      {trailing}
      {count != null && (
        <span className="font-mono-data text-xs tabular-nums text-ink-soft">
          {formatCount(count)}
        </span>
      )}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-2.5 rounded-sm border px-3 py-2 text-left transition-colors",
    indent && "ml-3 border-l-2 border-l-line pl-3",
    selected
      ? "border-brass bg-brass/15 text-ink"
      : "border-transparent text-ink-soft hover:border-line hover:bg-card/80 hover:text-ink"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

interface FeedSidebarProps {
  feedView: FeedView;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  counts: {
    new: number;
    starred: number;
    dismissed: number;
    top: number;
    huntMatches: number;
    perHunt: Record<string, number>;
    marketplace: {
      all: number;
      ebay: number;
      chrono24: number;
    };
  };
  activeHunts: Hunt[];
  onFeedViewChange: (view: FeedView) => void;
  onScopeChange: (scope: AlertScope) => void;
  onMarketplaceChange: (filter: MarketplaceFilter) => void;
  className?: string;
}

export function FeedSidebar({
  feedView,
  alertScope,
  marketplaceFilter,
  counts,
  activeHunts,
  onFeedViewChange,
  onScopeChange,
  onMarketplaceChange,
  className,
}: FeedSidebarProps) {
  const isHuntScope =
    alertScope === "watchlist" || alertScope.startsWith("hunt:");

  const hasActiveFilter = alertScope !== "all" || marketplaceFilter !== "all";

  const selectNewWithScope = (scope: AlertScope) => {
    onFeedViewChange("new");
    onScopeChange(scope);
  };

  const toggleScope = (scope: AlertScope) => {
    onFeedViewChange("new");
    onScopeChange(alertScope === scope ? "all" : scope);
  };

  const toggleMarketplace = (filter: MarketplaceFilter) => {
    onFeedViewChange("new");
    onMarketplaceChange(marketplaceFilter === filter ? "all" : filter);
  };

  const clearFilters = () => {
    selectNewWithScope("all");
    onMarketplaceChange("all");
  };

  return (
    <aside className={cn("w-full shrink-0", className)}>
      <div className="space-y-6 rounded-sm border border-line-strong bg-card p-4">
        <div className="space-y-1">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
            Views
          </p>
          <SidebarRow
            label="New"
            count={counts.new}
            selected={feedView === "new"}
            onClick={() => onFeedViewChange("new")}
          />
          <SidebarRow
            label="Starred"
            count={counts.starred}
            selected={feedView === "starred"}
            onClick={() => onFeedViewChange("starred")}
          />
          <SidebarRow
            label="Dismissed"
            count={counts.dismissed}
            selected={feedView === "dismissed"}
            onClick={() => onFeedViewChange("dismissed")}
          />
        </div>

        {feedView === "new" && (
          <div className="space-y-1 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                Filters
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-brass underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <SidebarRow
              label="All listings"
              count={counts.new}
              selected={alertScope === "all"}
              onClick={() => selectNewWithScope("all")}
            />
            <SidebarRow
              label="Top matches"
              count={counts.top}
              selected={alertScope === "top"}
              onClick={() => toggleScope("top")}
            />
            <div className="space-y-1">
              <div className="flex items-stretch gap-1">
                <div className="min-w-0 flex-1">
                  <SidebarRow
                    label="Hunt matches"
                    count={counts.huntMatches}
                    selected={isHuntScope}
                    onClick={() => {
                      if (alertScope === "watchlist") {
                        clearFilters();
                      } else {
                        selectNewWithScope("watchlist");
                      }
                    }}
                  />
                </div>
                <Link
                  href="/hunts"
                  className="flex w-9 shrink-0 items-center justify-center self-stretch rounded-sm border border-line-strong text-ink-soft hover:border-ink/30 hover:text-ink"
                  aria-label="Edit hunts"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>

              {isHuntScope && (
                <div className="space-y-1 pl-1">
                  <SidebarRow
                    label="All hunts"
                    count={counts.huntMatches}
                    selected={alertScope === "watchlist"}
                    indent
                    onClick={() => toggleScope("watchlist")}
                  />
                  {activeHunts.map((hunt) => {
                    const huntScope = `hunt:${hunt.id}` as AlertScope;
                    return (
                      <SidebarRow
                        key={hunt.id}
                        label={hunt.name}
                        count={counts.perHunt[hunt.id] ?? 0}
                        selected={alertScope === huntScope}
                        indent
                        trailing={
                          <HuntHeartsPicker value={hunt.hearts ?? 2} size="xs" />
                        }
                        onClick={() => toggleScope(huntScope)}
                      />
                    );
                  })}
                  <SidebarRow
                    label="New hunt"
                    indent
                    href="/hunts"
                    trailing={<Plus className="h-3 w-3 text-ink-soft" />}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {feedView === "new" && (
          <div className="space-y-1 border-t border-line pt-4">
            <p className="px-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Marketplace
            </p>
            <SidebarRow
              label="All marketplaces"
              count={counts.marketplace.all}
              selected={marketplaceFilter === "all"}
              onClick={() => onMarketplaceChange("all")}
            />
            <SidebarRow
              label="eBay"
              count={counts.marketplace.ebay}
              selected={marketplaceFilter === "ebay"}
              onClick={() => toggleMarketplace("ebay")}
            />
            <SidebarRow
              label="Chrono24"
              count={counts.marketplace.chrono24}
              selected={marketplaceFilter === "chrono24"}
              onClick={() => toggleMarketplace("chrono24")}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
