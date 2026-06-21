"use client";

import { FeedAttributeFilters } from "@/components/feed-attribute-filters";
import {
  FilterSection,
  FilterTableRow,
  filterSectionDividerClassName,
} from "@/components/filter-chip";
import { hasActiveFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import type { AlertScope, MarketplaceFilter } from "@/lib/listings/types";
import type { AttrKey, HuntAttribute } from "@/lib/hunts/types";
import type { AttributeLibrary } from "@/lib/persistence/types";
import type { FeedView } from "@/store/caseback";
import { cn } from "@/lib/utils";

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
    huntMatches: number;
    perHunt: Record<string, number>;
    marketplace: {
      all: number;
      ebay: number;
      chrono24: number;
      etsy: number;
    };
  };
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
  onFeedViewChange,
  onScopeChange,
  onMarketplaceChange,
  onToggleFeedAttributeFilter,
  onAddFeedAttributeFilter,
  onClearFeedAttributeFilters,
  className,
}: FeedSidebarProps) {
  const isBrowsingFeed = feedView === "new" || feedView === "all";
  const hasAttributeFilters = hasActiveFeedAttributeFilters(feedAttributeFilters);
  const hasActiveFilter =
    alertScope !== "all" ||
    marketplaceFilter !== "all" ||
    hasAttributeFilters;

  const selectNewWithScope = (scope: AlertScope) => {
    onFeedViewChange("new");
    onScopeChange(scope);
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
      <div className="max-h-none overflow-y-visible overscroll-y-contain rounded-sm border border-line-strong bg-card p-2.5 pb-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto md:pr-0.5 [scrollbar-gutter:stable]">
        {hasActiveFilter && (
          <div className="mb-1.5 flex justify-end px-0.5">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-brass underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <FilterSection
          label="Views"
          action={
            feedView !== "new" ? (
              <button
                type="button"
                onClick={() => selectNewWithScope("all")}
                className="text-xs text-brass underline-offset-2 hover:underline"
              >
                Clear
              </button>
            ) : undefined
          }
        >
          <FilterTableRow
            selected={feedView === "all"}
            count={counts.all}
            onClick={() => {
              onFeedViewChange("all");
              onScopeChange("all");
            }}
          >
            All listings
          </FilterTableRow>
          <FilterTableRow
            selected={feedView === "new"}
            count={counts.new}
            onClick={() => selectNewWithScope("all")}
          >
            New listings
          </FilterTableRow>
          <FilterTableRow
            selected={feedView === "starred"}
            count={counts.starred}
            onClick={() => onFeedViewChange("starred")}
          >
            Saved
          </FilterTableRow>
          <FilterTableRow
            selected={feedView === "dismissed"}
            count={counts.dismissed}
            onClick={() => onFeedViewChange("dismissed")}
          >
            Dismissed
          </FilterTableRow>
        </FilterSection>

        {isBrowsingFeed && (
          <>
            <FilterSection
              label="Marketplace"
              className={filterSectionDividerClassName()}
              action={
                marketplaceFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => onMarketplaceChange("all")}
                    className="text-xs text-brass underline-offset-2 hover:underline"
                  >
                    Clear
                  </button>
                ) : undefined
              }
            >
              <FilterTableRow
                selected={marketplaceFilter === "all"}
                count={counts.marketplace.all}
                onClick={() => onMarketplaceChange("all")}
              >
                All marketplaces
              </FilterTableRow>
              <FilterTableRow
                selected={marketplaceFilter === "ebay"}
                count={counts.marketplace.ebay}
                onClick={() => toggleMarketplace("ebay")}
              >
                eBay
              </FilterTableRow>
              <FilterTableRow
                selected={marketplaceFilter === "chrono24"}
                count={counts.marketplace.chrono24}
                onClick={() => toggleMarketplace("chrono24")}
              >
                Chrono24
              </FilterTableRow>
              <FilterTableRow
                selected={marketplaceFilter === "etsy"}
                count={counts.marketplace.etsy}
                onClick={() => toggleMarketplace("etsy")}
              >
                Etsy
              </FilterTableRow>
            </FilterSection>

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
