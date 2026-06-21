"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HuntHeartsPicker } from "@/components/hunt-hearts";
import { FeedAttributeFilters } from "@/components/feed-attribute-filters";
import { hasActiveFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import type { AlertScope, MarketplaceFilter } from "@/lib/listings/types";
import type { AttrKey, Hunt, HuntAttribute } from "@/lib/hunts/types";
import type { AttributeLibrary } from "@/lib/persistence/types";
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

function SidebarCollapsibleSection({
  label,
  open,
  onOpenChange,
  children,
  className,
  onClear,
  showClear = false,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  onClear?: () => void;
  showClear?: boolean;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <div className="flex items-center justify-between gap-2 px-1">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm py-1.5 text-left text-xs font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
          <span>{label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-brass underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <CollapsibleContent className="space-y-1 pt-1 data-[state=closed]:overflow-hidden data-[state=open]:overflow-visible data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FeedSidebarProps {
  feedView: FeedView;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
  attributeLibrary: AttributeLibrary;
  counts: {
    all: number;
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
      etsy: number;
    };
  };
  activeHunts: Hunt[];
  onFeedViewChange: (view: FeedView) => void;
  onScopeChange: (scope: AlertScope) => void;
  onMarketplaceChange: (filter: MarketplaceFilter) => void;
  onToggleFeedAttributeFilter: (key: AttrKey, value: string) => void;
  onAddFeedAttributeFilter: (key: AttrKey, value: string) => void;
  onClearFeedAttributeFilters: () => void;
  className?: string;
}

export function FeedSidebar({
  feedView,
  alertScope,
  marketplaceFilter,
  feedAttributeFilters,
  attributeLibrary,
  counts,
  activeHunts,
  onFeedViewChange,
  onScopeChange,
  onMarketplaceChange,
  onToggleFeedAttributeFilter,
  onAddFeedAttributeFilter,
  onClearFeedAttributeFilters,
  className,
}: FeedSidebarProps) {
  const isHuntScope =
    alertScope === "watchlist" || alertScope.startsWith("hunt:");

  const isBrowsingFeed = feedView === "new" || feedView === "all";
  const hasAttributeFilters = hasActiveFeedAttributeFilters(feedAttributeFilters);
  const hasActiveFilter =
    alertScope !== "all" ||
    marketplaceFilter !== "all" ||
    hasAttributeFilters;

  const [marketplaceOpen, setMarketplaceOpen] = useState(false);

  const selectNewWithScope = (scope: AlertScope) => {
    onFeedViewChange("new");
    onScopeChange(scope);
  };

  const selectAllListings = () => {
    onFeedViewChange("all");
    onScopeChange("all");
  };

  const toggleScope = (scope: AlertScope) => {
    onFeedViewChange("new");
    onScopeChange(alertScope === scope ? "all" : scope);
  };

  const toggleMarketplace = (filter: MarketplaceFilter) => {
    if (feedView === "starred" || feedView === "dismissed") {
      onFeedViewChange("new");
    }
    onMarketplaceChange(marketplaceFilter === filter ? "all" : filter);
  };

  const clearFilters = () => {
    selectNewWithScope("all");
    onMarketplaceChange("all");
    onClearFeedAttributeFilters();
  };

  return (
    <aside
      className={cn(
        "w-full shrink-0 md:sticky md:top-4 md:self-start md:min-h-0",
        className
      )}
    >
      <div className="max-h-none overflow-y-visible overscroll-y-contain rounded-sm border border-line-strong bg-card p-4 pb-8 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto md:pr-0.5 [scrollbar-gutter:stable]">
        {hasActiveFilter && (
          <div className="mb-3 flex justify-end px-1">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-brass underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="space-y-1">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
            Views
          </p>
          <SidebarRow
            label="All listings"
            count={counts.all}
            selected={feedView === "all"}
            onClick={selectAllListings}
          />
          <SidebarRow
            label="New listings"
            count={counts.new}
            selected={feedView === "new"}
            onClick={() => selectNewWithScope("all")}
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

        {isBrowsingFeed && (
          <>
            <div className="space-y-1 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                  Highlights
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
                label="Top matches"
                count={counts.top}
                selected={alertScope === "top"}
                onClick={() => toggleScope("top")}
              />
              <div className="space-y-1">
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
                            <HuntHeartsPicker value={hunt.hearts} size="xs" />
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

            <SidebarCollapsibleSection
              label="Marketplace"
              open={marketplaceOpen}
              onOpenChange={setMarketplaceOpen}
              className="border-t border-line pt-4"
              showClear={marketplaceFilter !== "all"}
              onClear={() => onMarketplaceChange("all")}
            >
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
              <SidebarRow
                label="Etsy"
                count={counts.marketplace.etsy}
                selected={marketplaceFilter === "etsy"}
                onClick={() => toggleMarketplace("etsy")}
              />
            </SidebarCollapsibleSection>

            <FeedAttributeFilters
              filters={feedAttributeFilters}
              attributeLibrary={attributeLibrary}
              onToggle={onToggleFeedAttributeFilter}
              onAddCustom={onAddFeedAttributeFilter}
              onClear={onClearFeedAttributeFilters}
            />
          </>
        )}
      </div>
    </aside>
  );
}
