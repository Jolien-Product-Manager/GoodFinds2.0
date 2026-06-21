"use client";

import { useMemo, useState } from "react";
import {
  ATTR_OPTIONS,
  FEED_FILTER_ATTR_KEYS,
  isAttributeValueSelected,
  type AttrKey,
  type HuntAttribute,
} from "@/lib/hunts/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilterSearchBar, matchesFilterSearch } from "@/components/filter-search-bar";
import { cn } from "@/lib/utils";

interface FeedAttributeFiltersProps {
  filters: Record<AttrKey, HuntAttribute>;
  onToggle: (key: AttrKey, value: string) => void;
  className?: string;
}

function categoryHasSelection(attr: HuntAttribute | undefined): boolean {
  return (attr?.picks.length ?? 0) + (attr?.customs.length ?? 0) > 0;
}

function FeedFilterCategory({
  attrKey,
  filters,
  onToggle,
}: {
  attrKey: AttrKey;
  filters: Record<AttrKey, HuntAttribute>;
  onToggle: (key: AttrKey, value: string) => void;
}) {
  const attr = filters[attrKey];
  const options = ATTR_OPTIONS[attrKey].options;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesFilterSearch(query, option)),
    [options, query]
  );

  if (options.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-line/60 pt-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
        <span className="truncate">{ATTR_OPTIONS[attrKey].label}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {categoryHasSelection(attr) && (
            <span className="rounded-full bg-brass/15 px-1.5 py-0.5 font-mono-data text-[10px] normal-case tracking-normal text-ink">
              {(attr?.picks.length ?? 0) + (attr?.customs.length ?? 0)}
            </span>
          )}
          <span
            className={cn(
              "inline-block h-3 w-3 rotate-0 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        <div className="max-h-44 space-y-0.5 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-ink-soft">No matches</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(attrKey, option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                  isAttributeValueSelected(attr, option)
                    ? "bg-brass/15 text-ink"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                )}
              >
                <span
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-[2px] border",
                    isAttributeValueSelected(attr, option)
                      ? "border-brass bg-brass/30"
                      : "border-line-strong bg-card"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{option}</span>
              </button>
            ))
          )}
        </div>
        <FilterSearchBar
          value={query}
          onChange={setQuery}
          placeholder={`Search ${ATTR_OPTIONS[attrKey].label.toLowerCase()}…`}
          className="mt-1.5"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FeedAttributeFilters({
  filters,
  onToggle,
  className,
}: FeedAttributeFiltersProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionQuery, setSectionQuery] = useState("");

  const visibleKeys = useMemo(
    () =>
      FEED_FILTER_ATTR_KEYS.filter((key) =>
        matchesFilterSearch(sectionQuery, ATTR_OPTIONS[key].label)
      ),
    [sectionQuery]
  );

  return (
    <Collapsible
      open={sectionOpen}
      onOpenChange={setSectionOpen}
      className={cn("border-t border-line pt-4", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
        <span>Other filters</span>
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rotate-0 transition-transform duration-200",
            sectionOpen && "rotate-180"
          )}
          aria-hidden
        >
          ▾
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 overflow-hidden pt-1">
        <FilterSearchBar
          value={sectionQuery}
          onChange={setSectionQuery}
          placeholder="Search filter categories…"
          className="mb-1.5"
        />
        {visibleKeys.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-ink-soft">No matching categories</p>
        ) : (
          visibleKeys.map((key) => (
            <FeedFilterCategory
              key={key}
              attrKey={key}
              filters={filters}
              onToggle={onToggle}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
