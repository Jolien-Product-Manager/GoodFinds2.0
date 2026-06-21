"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDraftHunt,
  FEED_CUSTOM_ATTR_KEY,
  FEED_SIDEBAR_ATTR_KEYS,
  feedSidebarAttrLabel,
  isAttributeValueSelected,
  normalizeCustomValue,
  type AttrKey,
  type HuntAttribute,
} from "@/lib/hunts/types";
import { resolveHuntSearchIntent } from "@/lib/hunts/search-intent";
import type { AttributeLibrary } from "@/lib/persistence/types";
import { hasActiveFeedAttributeFilters } from "@/lib/listings/feed-attribute-filter";
import {
  buildFeedFilterCatalog,
  feedFilterOptionsForKey,
  finalizeFeedFilterMatches,
  isPresetFeedOption,
  matchFeedFilterOptionsLocal,
  type FeedFilterMatch,
} from "@/lib/listings/feed-filter-search";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilterSearchBar, matchesFilterSearch } from "@/components/filter-search-bar";
import { cn } from "@/lib/utils";

interface FeedAttributeFiltersProps {
  filters: Record<AttrKey, HuntAttribute>;
  attributeLibrary: AttributeLibrary;
  onToggle: (key: AttrKey, value: string) => void;
  onAddCustom: (key: AttrKey, value: string) => void;
  onClear?: () => void;
  className?: string;
}

function categoryOptions(
  key: AttrKey,
  attributeLibrary: AttributeLibrary,
  filters: Record<AttrKey, HuntAttribute>
): string[] {
  return feedFilterOptionsForKey(key, attributeLibrary, filters);
}

function categoryMatchingOptions(
  key: AttrKey,
  query: string,
  attributeLibrary: AttributeLibrary,
  filters: Record<AttrKey, HuntAttribute>,
  searchMatches: FeedFilterMatch[] | null
): string[] {
  const options = categoryOptions(key, attributeLibrary, filters);
  const q = query.trim();
  if (!q) return options;

  if (searchMatches) {
    const matched = searchMatches
      .filter((entry) => entry.key === key)
      .map((entry) => entry.value);
    if (matched.length > 0) return matched;
    return [];
  }

  return options.filter((option) => matchesFilterSearch(q, option));
}

async function resolveFeedCustomFilterTarget(
  query: string,
  attributeLibrary: AttributeLibrary
): Promise<{ key: AttrKey; value: string }> {
  const trimmed = query.trim();
  const intent = await resolveHuntSearchIntent(
    trimmed,
    createDraftHunt(),
    attributeLibrary,
    {}
  );
  if (intent?.kind === "attr") {
    const key = intent.key;
    if (key === "model" && !isPresetFeedOption("model", intent.value)) {
      return { key: FEED_CUSTOM_ATTR_KEY, value: trimmed };
    }
    if ((FEED_SIDEBAR_ATTR_KEYS as readonly AttrKey[]).includes(key)) {
      return { key, value: intent.value };
    }
  }
  if (intent?.kind === "custom") {
    return { key: FEED_CUSTOM_ATTR_KEY, value: intent.value };
  }
  return { key: FEED_CUSTOM_ATTR_KEY, value: trimmed };
}

function isTermActiveInFilters(
  filters: Record<AttrKey, HuntAttribute>,
  value: string
): boolean {
  const norm = normalizeCustomValue(value);
  return FEED_SIDEBAR_ATTR_KEYS.some((key) => {
    const attr = filters[key];
    return [...(attr?.picks ?? []), ...(attr?.customs ?? [])].some(
      (v) => normalizeCustomValue(v) === norm
    );
  });
}

function FeedCustomFilterAdd({
  query,
  filters,
  attributeLibrary,
  onAdd,
}: {
  query: string;
  filters: Record<AttrKey, HuntAttribute>;
  attributeLibrary: AttributeLibrary;
  onAdd: (key: AttrKey, value: string) => void;
}) {
  const [value, setValue] = useState(query);
  const [target, setTarget] = useState<{ key: AttrKey; value: string } | null>(
    null
  );

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    void resolveFeedCustomFilterTarget(trimmed, attributeLibrary).then((next) => {
      if (!cancelled) setTarget(next);
    });
    return () => {
      cancelled = true;
    };
  }, [value, attributeLibrary]);

  const trimmed = value.trim();
  const alreadyActive = trimmed ? isTermActiveInFilters(filters, trimmed) : false;
  const categoryLabel = target ? feedSidebarAttrLabel(target.key) : null;

  const handleAdd = useCallback(() => {
    if (!target || alreadyActive) return;
    onAdd(target.key, target.value);
    setValue("");
  }, [alreadyActive, onAdd, target]);

  return (
    <div className="space-y-2 rounded-sm border border-line bg-paper/40 px-2 py-2">
      <p className="text-xs text-ink-soft">
        No preset match for &ldquo;{query.trim()}&rdquo;
      </p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add your own filter term…"
          className="h-8 min-w-0 flex-1 border-line-strong bg-card text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-sm px-2.5 text-xs"
          disabled={!trimmed || alreadyActive}
          onClick={handleAdd}
        >
          <Search className="mr-1 h-3 w-3" />
          Search
        </Button>
      </div>
      {alreadyActive ? (
        <p className="text-[11px] text-ink-soft">Already filtering on this term</p>
      ) : categoryLabel && target ? (
        <p className="text-[11px] text-ink-soft">
          Adds under {categoryLabel}
          {target?.key === FEED_CUSTOM_ATTR_KEY ? " · matches listing titles" : ""}
        </p>
      ) : null}
    </div>
  );
}

function categoryHasSelection(attr: HuntAttribute | undefined): boolean {
  return (attr?.picks.length ?? 0) + (attr?.customs.length ?? 0) > 0;
}

function FeedFilterCategory({
  attrKey,
  filters,
  attributeLibrary,
  onToggle,
  sectionQuery = "",
  searchMatches,
}: {
  attrKey: AttrKey;
  filters: Record<AttrKey, HuntAttribute>;
  attributeLibrary: AttributeLibrary;
  onToggle: (key: AttrKey, value: string) => void;
  sectionQuery?: string;
  searchMatches: FeedFilterMatch[] | null;
}) {
  const attr = filters[attrKey];
  const options = categoryOptions(attrKey, attributeLibrary, filters);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sectionSearchActive = sectionQuery.trim().length > 0;
  const effectiveQuery = sectionSearchActive ? sectionQuery : query;

  const filteredOptions = useMemo(
    () =>
      categoryMatchingOptions(
        attrKey,
        effectiveQuery,
        attributeLibrary,
        filters,
        sectionSearchActive ? searchMatches : null
      ),
    [
      attrKey,
      effectiveQuery,
      attributeLibrary,
      filters,
      sectionSearchActive,
      searchMatches,
    ]
  );

  useEffect(() => {
    if (sectionSearchActive && filteredOptions.length > 0) {
      setOpen(true);
    }
  }, [sectionSearchActive, filteredOptions.length, sectionQuery]);

  if (options.length === 0 && filteredOptions.length === 0) return null;
  if (sectionSearchActive && filteredOptions.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-line/60 pt-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1 text-left text-[11px] font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
        <span className="truncate">{feedSidebarAttrLabel(attrKey)}</span>
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
      <CollapsibleContent className="pt-1 data-[state=closed]:overflow-hidden data-[state=open]:overflow-visible">
        <div className="space-y-0.5 pb-1">
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
        {!sectionSearchActive && (
          <FilterSearchBar
            value={query}
            onChange={setQuery}
            placeholder={`Search ${feedSidebarAttrLabel(attrKey).toLowerCase()}…`}
            className="mt-1.5"
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FeedAttributeFilters({
  filters,
  attributeLibrary,
  onToggle,
  onAddCustom,
  onClear,
  className,
}: FeedAttributeFiltersProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionQuery, setSectionQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<FeedFilterMatch[] | null>(
    null
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const hasActiveFilters = hasActiveFeedAttributeFilters(filters);

  const trimmedSectionQuery = sectionQuery.trim();
  const catalog = useMemo(
    () => buildFeedFilterCatalog(attributeLibrary, filters),
    [attributeLibrary, filters]
  );

  useEffect(() => {
    if (!trimmedSectionQuery) {
      setSearchMatches(null);
      setSearchLoading(false);
      return;
    }

    const local = finalizeFeedFilterMatches(
      matchFeedFilterOptionsLocal(trimmedSectionQuery, catalog),
      trimmedSectionQuery
    );
    setSearchMatches(local);

    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const res = await fetch("/api/feed-filter-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: trimmedSectionQuery,
              attributeLibrary,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { matches?: FeedFilterMatch[] };
            if (Array.isArray(data.matches)) {
              setSearchMatches(
                finalizeFeedFilterMatches(data.matches, trimmedSectionQuery)
              );
            }
          }
        } catch {
          // Keep local matches on failure.
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [trimmedSectionQuery, catalog, attributeLibrary]);

  const visibleKeys = useMemo(() => {
    if (!trimmedSectionQuery) {
      return FEED_SIDEBAR_ATTR_KEYS.filter((key) => {
        if (key === FEED_CUSTOM_ATTR_KEY) {
          return categoryHasSelection(filters[key]);
        }
        return categoryOptions(key, attributeLibrary, filters).length > 0;
      });
    }
    if (searchMatches) {
      const keys = new Set(searchMatches.map((entry) => entry.key));
      return FEED_SIDEBAR_ATTR_KEYS.filter((key) => keys.has(key));
    }
    return FEED_SIDEBAR_ATTR_KEYS.filter(
      (key) =>
        categoryMatchingOptions(
          key,
          trimmedSectionQuery,
          attributeLibrary,
          filters,
          null
        ).length > 0
    );
  }, [
    trimmedSectionQuery,
    searchMatches,
    attributeLibrary,
    filters,
  ]);

  const showCustomAdd =
    trimmedSectionQuery.length > 0 && !searchLoading && visibleKeys.length === 0;

  const applySectionSearch = useCallback(() => {
    if (!trimmedSectionQuery) return;
    const matches = finalizeFeedFilterMatches(
      searchMatches ??
        matchFeedFilterOptionsLocal(trimmedSectionQuery, catalog),
      trimmedSectionQuery
    );
    if (matches.length === 0) return;

    const match = matches[0];
    const attr = filters[match.key];
    if (isAttributeValueSelected(attr, match.value)) {
      setSectionQuery("");
      return;
    }

    if (match.key === FEED_CUSTOM_ATTR_KEY) {
      onAddCustom(match.key, match.value);
    } else {
      onToggle(match.key, match.value);
    }
    setSectionQuery("");
  }, [
    trimmedSectionQuery,
    searchMatches,
    catalog,
    filters,
    onAddCustom,
    onToggle,
  ]);

  const handleAddCustom = useCallback(
    (key: AttrKey, value: string) => {
      onAddCustom(key, value);
      setSectionQuery("");
    },
    [onAddCustom]
  );

  return (
    <Collapsible
      open={sectionOpen}
      onOpenChange={setSectionOpen}
      className={cn("border-t border-line pt-4", className)}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm py-1.5 text-left text-xs font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
          <span>Search</span>
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 shrink-0 rotate-0 transition-transform duration-200",
              sectionOpen && "rotate-180"
            )}
            aria-hidden
          >
            ▾
          </span>
        </CollapsibleTrigger>
        {hasActiveFilters && onClear && (
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
        <FilterSearchBar
          value={sectionQuery}
          onChange={setSectionQuery}
          placeholder="Search key terms…"
          className="mb-1.5"
          onSubmit={applySectionSearch}
        />
        {searchLoading && trimmedSectionQuery.length > 0 && (
          <p className="px-1 pb-1 text-[11px] text-ink-soft">Searching…</p>
        )}
        {!searchLoading &&
          trimmedSectionQuery.length > 0 &&
          visibleKeys.length > 0 && (
            <p className="px-1 pb-1 text-[11px] text-ink-soft">
              Select a match or press Enter to filter
            </p>
          )}
        {showCustomAdd ? (
          <FeedCustomFilterAdd
            query={trimmedSectionQuery}
            filters={filters}
            attributeLibrary={attributeLibrary}
            onAdd={handleAddCustom}
          />
        ) : visibleKeys.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-ink-soft">No matching filters</p>
        ) : (
          visibleKeys.map((key) => (
            <FeedFilterCategory
              key={key}
              attrKey={key}
              filters={filters}
              attributeLibrary={attributeLibrary}
              onToggle={onToggle}
              sectionQuery={sectionQuery}
              searchMatches={searchMatches}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
