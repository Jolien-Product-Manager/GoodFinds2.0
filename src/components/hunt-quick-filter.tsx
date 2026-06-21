"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { MatchQualityLevel } from "@/lib/listings/types";
import type { Hunt } from "@/lib/hunts/types";
import type { FeedCountsResponse } from "@/lib/listings/feed-api";
import {
  hasHuntFindsFilters,
} from "@/lib/listings/hunt-finds-filter";
import { matchQualityDotClass } from "@/lib/listings/hunt-match";
import { filterSectionLabelClassName } from "@/components/filter-chip";
import { cn } from "@/lib/utils";

interface HuntQuickFilterProps {
  activeHunts: Hunt[];
  selectedHuntIds: string[];
  selectedMatchQualities: MatchQualityLevel[];
  counts: FeedCountsResponse;
  onToggleAllHunts: () => void;
  onToggleHunt: (huntId: string) => void;
  onToggleMatchQuality: (quality: MatchQualityLevel) => void;
  onClearFilters: () => void;
  className?: string;
}

const MATCH_QUALITY_OPTIONS: {
  value: MatchQualityLevel;
  label: string;
}[] = [
  { value: "perfect", label: "Perfect" },
  { value: "close", label: "Good" },
  { value: "loose", label: "Loose" },
];

function compactChipClass(selected: boolean) {
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors",
    selected
      ? "border-brass bg-brass/15 text-ink"
      : "border-line-strong bg-paper/50 text-ink-soft hover:border-line hover:bg-paper hover:text-ink"
  );
}

function compactCountClass() {
  return "ml-1 font-mono text-[10px] tabular-nums text-ink-soft";
}

export function HuntQuickFilter({
  activeHunts,
  selectedHuntIds,
  selectedMatchQualities,
  counts,
  onToggleAllHunts,
  onToggleHunt,
  onToggleMatchQuality,
  onClearFilters,
  className,
}: HuntQuickFilterProps) {
  if (activeHunts.length === 0) return null;

  const activeHuntIds = activeHunts.map((hunt) => hunt.id);
  const allHuntsSelected =
    activeHuntIds.length > 0 &&
    activeHuntIds.every((id) => selectedHuntIds.includes(id));
  const hasActiveFilter = hasHuntFindsFilters(
    selectedHuntIds,
    selectedMatchQualities
  );

  return (
    <div
      className={cn(
        "rounded-sm border border-line-strong bg-card p-2 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={filterSectionLabelClassName()}>Hunt finds</p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClearFilters}
            className="shrink-0 text-[11px] text-brass underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-pressed={allHuntsSelected}
          onClick={onToggleAllHunts}
          className={compactChipClass(allHuntsSelected)}
        >
          All hunts
          <span className={compactCountClass()}>
            {counts.huntMatches.toLocaleString()}
          </span>
        </button>

        {activeHunts.map((hunt) => {
          const selected = selectedHuntIds.includes(hunt.id);
          const count = counts.perHunt[hunt.id] ?? 0;

          return (
            <button
              key={hunt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleHunt(hunt.id)}
              className={compactChipClass(selected)}
            >
              {hunt.name}
              <span className={compactCountClass()}>{count.toLocaleString()}</span>
            </button>
          );
        })}

        <Link
          href="/hunts"
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-line-strong bg-paper/50 px-2 py-0.5 text-[11px] font-medium text-ink-soft transition-colors hover:border-line hover:bg-paper hover:text-ink"
        >
          <Plus className="h-3 w-3" aria-hidden />
          New
        </Link>
      </div>

      <div className="mt-2 border-t border-line pt-2">
        <p className={filterSectionLabelClassName()}>Match quality</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {MATCH_QUALITY_OPTIONS.map(({ value, label }) => {
            const selected = selectedMatchQualities.includes(value);
            const count = counts.matchQuality[value];

            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleMatchQuality(value)}
                className={compactChipClass(selected)}
              >
                <span
                  className={cn(
                    "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                    matchQualityDotClass(value)
                  )}
                  aria-hidden
                />
                {label}
                <span className={compactCountClass()}>{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}