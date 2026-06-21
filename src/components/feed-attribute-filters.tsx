"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ATTR_OPTIONS,
  createDraftHunt,
  FEED_FILTER_ATTR_KEYS,
  isAttributeValueSelected,
  normalizeCustomValue,
  type AttrKey,
  type HuntAttribute,
} from "@/lib/hunts/types";
import { resolveHuntSearchIntentRules } from "@/lib/hunts/search-intent";
import type { AttributeLibrary } from "@/lib/persistence/types";
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
  className?: string;
}

function categoryOptions(key: AttrKey, attributeLibrary: AttributeLibrary): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [
    ...ATTR_OPTIONS[key].options,
    ...(attributeLibrary[key] ?? []),
  ]) {
    const norm = normalizeCustomValue(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(raw);
  }
  return out;
}

function categoryMatchingOptions(
  key: AttrKey,
  query: string,
  attributeLibrary: AttributeLibrary
): string[] {
  const options = categoryOptions(key, attributeLibrary);
  const q = query.trim();
  if (!q) return options;
  return options.filter((option) => matchesFilterSearch(q, option));
}

function resolveFeedCustomFilterTarget(
  query: string,
  attributeLibrary: AttributeLibrary
): { key: AttrKey; value: string } {
  const trimmed = query.trim();
  const intent = resolveHuntSearchIntentRules(
    trimmed,
    createDraftHunt(),
    attributeLibrary,
    {}
  );
  if (intent?.kind === "attr") {
    const key = intent.key;
    if ((FEED_FILTER_ATTR_KEYS as readonly AttrKey[]).includes(key)) {
      return { key, value: intent.value };
    }
  }
  return { key: "model", value: trimmed };
}

function isTermActiveInFilters(
  filters: Record<AttrKey, HuntAttribute>,
  value: string
): boolean {
  const norm = normalizeCustomValue(value);
  return FEED_FILTER_ATTR_KEYS.some((key) => {
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

  useEffect(() => {
    setValue(query);
  }, [query]);

  const trimmed = value.trim();
  const target = trimmed
    ? resolveFeedCustomFilterTarget(trimmed, attributeLibrary)
    : null;
  const alreadyActive = trimmed ? isTermActiveInFilters(filters, trimmed) : false;
  const categoryLabel = target
    ? ATTR_OPTIONS[target.key].label
    : null;

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
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
      {alreadyActive ? (
        <p className="text-[11px] text-ink-soft">Already filtering on this term</p>
      ) : categoryLabel && target ? (
        <p className="text-[11px] text-ink-soft">
          Adds under {categoryLabel}
          {target.key === "model" ? " · matches listing titles" : ""}
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
}: {
  attrKey: AttrKey;
  filters: Record<AttrKey, HuntAttribute>;
  attributeLibrary: AttributeLibrary;
  onToggle: (key: AttrKey, value: string) => void;
  sectionQuery?: string;
}) {
  const attr = filters[attrKey];
  const options = categoryOptions(attrKey, attributeLibrary);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sectionSearchActive = sectionQuery.trim().length > 0;
  const effectiveQuery = sectionSearchActive ? sectionQuery : query;

  const filteredOptions = useMemo(
    () => categoryMatchingOptions(attrKey, effectiveQuery, attributeLibrary),
    [attrKey, effectiveQuery, attributeLibrary]
  );

  useEffect(() => {
    if (sectionSearchActive && filteredOptions.length > 0) {
      setOpen(true);
    }
  }, [sectionSearchActive, filteredOptions.length, sectionQuery]);

  if (options.length === 0) return null;
  if (sectionSearchActive && filteredOptions.length === 0) return null;

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
        {!sectionSearchActive && (
          <FilterSearchBar
            value={query}
            onChange={setQuery}
            placeholder={`Search ${ATTR_OPTIONS[attrKey].label.toLowerCase()}…`}
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
  className,
}: FeedAttributeFiltersProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionQuery, setSectionQuery] = useState("");

  const trimmedSectionQuery = sectionQuery.trim();

  const visibleKeys = useMemo(() => {
    if (!trimmedSectionQuery) return FEED_FILTER_ATTR_KEYS;
    return FEED_FILTER_ATTR_KEYS.filter(
      (key) =>
        categoryMatchingOptions(key, trimmedSectionQuery, attributeLibrary).length >
        0
    );
  }, [trimmedSectionQuery, attributeLibrary]);

  const showCustomAdd = trimmedSectionQuery.length > 0 && visibleKeys.length === 0;

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
          placeholder="Search key terms…"
          className="mb-1.5"
        />
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
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
