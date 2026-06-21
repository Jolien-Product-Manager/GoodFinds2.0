"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FeedAttributeFilters } from "@/components/feed-attribute-filters";
import {
  FeedGlobalFilters,
  hasCustomGlobalFilters,
} from "@/components/feed-global-filters";
import {
  FilterSection,
  FilterTableRow,
  filterSectionDividerClassName,
  filterSectionLabelClassName,
} from "@/components/filter-chip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { hasActiveFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import type { MarketplaceFilter, MatchQualityLevel } from "@/lib/listings/types";
import { hasHuntFindsFilters } from "@/lib/listings/hunt-finds-filter";
import type { AttrKey, GlobalFilters, HuntAttribute } from "@/lib/hunts/types";
import type { AttributeLibrary } from "@/lib/persistence/types";
import type { FeedView } from "@/store/caseback";
import { cn } from "@/lib/utils";

interface FeedSidebarProps {
  feedView: FeedView;
  selectedHuntIds: string[];
  selectedMatchQualities: MatchQualityLevel[];
  marketplaceFilter: MarketplaceFilter;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
  globalFilters: GlobalFilters;
  savedGlobalFilters: GlobalFilters;
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
  onClearHuntFindsFilters: () => void;
  onMarketplaceChange: (filter: MarketplaceFilter) => void;
  onToggleFeedAttributeFilter: (key: AttrKey, value: string) => void;
  onAddFeedAttributeFilter: (key: AttrKey, value: string) => void;
  onClearFeedAttributeFilters: () => void;
  onGlobalFiltersChange: (filters: Partial<GlobalFilters>) => void;
  onResetGlobalFilters: () => void;
  className?: string;
}

export function FeedSidebar({
  feedView,
  selectedHuntIds,
  selectedMatchQualities,
  marketplaceFilter,
  feedAttributeFilters,
  globalFilters,
  savedGlobalFilters,
  attributeLibrary,
  counts,
  onFeedViewChange,
  onClearHuntFindsFilters,
  onMarketplaceChange,
  onToggleFeedAttributeFilter,
  onAddFeedAttributeFilter,
  onClearFeedAttributeFilters,
  onGlobalFiltersChange,
  onResetGlobalFilters,
  className,
}: FeedSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sidebarScrollable, setSidebarScrollable] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const isBrowsingFeed = feedView === "new" || feedView === "all";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScrollable = () => {
      if (!window.matchMedia("(min-width: 768px)").matches) {
        setSidebarScrollable(false);
        return;
      }
      const maxHeight = window.innerHeight - 32;
      setSidebarScrollable(el.scrollHeight > maxHeight);
    };

    checkScrollable();
    const observer = new ResizeObserver(checkScrollable);
    observer.observe(el);
    window.addEventListener("resize", checkScrollable);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkScrollable);
    };
  }, [
    feedView,
    selectedHuntIds,
    selectedMatchQualities,
    marketplaceFilter,
    feedAttributeFilters,
    globalFilters,
    marketplaceOpen,
  ]);
  const hasAttributeFilters = hasActiveFeedAttributeFilters(feedAttributeFilters);
  const hasCustomGlobal = hasCustomGlobalFilters(globalFilters, savedGlobalFilters);
  const hasActiveFilter =
    hasHuntFindsFilters(selectedHuntIds, selectedMatchQualities) ||
    marketplaceFilter !== "all" ||
    hasAttributeFilters ||
    hasCustomGlobal;

  const selectNewListings = () => {
    onFeedViewChange("new");
    onClearHuntFindsFilters();
  };

  const toggleMarketplace = (filter: MarketplaceFilter) => {
    if (feedView === "starred" || feedView === "dismissed") {
      onFeedViewChange("new");
    }
    onMarketplaceChange(marketplaceFilter === filter ? "all" : filter);
  };

  const clearFilters = () => {
    selectNewListings();
    onMarketplaceChange("all");
    onClearFeedAttributeFilters();
    onResetGlobalFilters();
  };

  return (
    <aside
      className={cn(
        "w-full shrink-0 md:sticky md:top-4 md:self-start md:min-h-0",
        className
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          "rounded-sm border border-line-strong bg-card p-2.5 pb-4",
          sidebarScrollable &&
            "md:max-h-[calc(100dvh-2rem)] md:min-h-0 md:overflow-y-auto md:pr-0.5 [scrollbar-gutter:stable]"
        )}
      >
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
                onClick={() => selectNewListings()}
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
              onClearHuntFindsFilters();
            }}
          >
            All listings
          </FilterTableRow>
          <FilterTableRow
            selected={feedView === "new"}
            count={counts.new}
            onClick={() => selectNewListings()}
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
            <Collapsible
              open={marketplaceOpen}
              onOpenChange={setMarketplaceOpen}
              className={filterSectionDividerClassName()}
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-2 py-0.5 text-left transition-colors">
                  <span className={filterSectionLabelClassName()}>Marketplace</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {marketplaceFilter !== "all" && (
                      <span className="rounded-sm border border-brass/30 bg-brass/15 px-1.5 py-0.5 font-mono text-[10px] capitalize text-ink">
                        {marketplaceFilter}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-200",
                        marketplaceOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </span>
                </CollapsibleTrigger>
                {marketplaceFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => onMarketplaceChange("all")}
                    className="shrink-0 text-xs text-brass underline-offset-2 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <CollapsibleContent className="flex flex-col gap-0.5 pt-1.5 data-[state=closed]:overflow-hidden">
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
              </CollapsibleContent>
            </Collapsible>

            <FeedGlobalFilters
              globalFilters={globalFilters}
              savedGlobalFilters={savedGlobalFilters}
              onChange={onGlobalFiltersChange}
            />

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
