"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { AlertScope } from "@/lib/listings/types";
import type { Hunt } from "@/lib/hunts/types";
import type { FeedCountsResponse } from "@/lib/listings/feed-api";
import {
  filterChipClassName,
  filterChipCountClassName,
  filterSectionClassName,
  filterSectionLabelClassName,
} from "@/components/filter-chip";
import { cn } from "@/lib/utils";

interface HuntQuickFilterProps {
  activeHunts: Hunt[];
  alertScope: AlertScope;
  counts: FeedCountsResponse;
  onScopeChange: (scope: AlertScope) => void;
  className?: string;
}

function toggleScope(current: AlertScope, next: AlertScope): AlertScope {
  return current === next ? "all" : next;
}

export function HuntQuickFilter({
  activeHunts,
  alertScope,
  counts,
  onScopeChange,
  className,
}: HuntQuickFilterProps) {
  if (activeHunts.length === 0) return null;

  return (
    <div className={cn(filterSectionClassName(), className)}>
      <p className={filterSectionLabelClassName()}>Hunt finds</p>
      <div className="mt-1.5 flex max-w-2xl flex-wrap gap-x-1.5 gap-y-1">
        <button
          type="button"
          aria-pressed={alertScope === "watchlist"}
          onClick={() => onScopeChange(toggleScope(alertScope, "watchlist"))}
          className={filterChipClassName(alertScope === "watchlist")}
        >
          All hunts
          <span className={filterChipCountClassName()}>
            {counts.huntMatches.toLocaleString()}
          </span>
        </button>

        {activeHunts.map((hunt) => {
          const huntScope = `hunt:${hunt.id}` as AlertScope;
          const selected = alertScope === huntScope;
          const count = counts.perHunt[hunt.id] ?? 0;

          return (
            <button
              key={hunt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onScopeChange(toggleScope(alertScope, huntScope))}
              className={filterChipClassName(selected)}
            >
              {hunt.name}
              <span className={filterChipCountClassName()}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}

        <Link
          href="/hunts"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong bg-paper/50 px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-line hover:bg-paper hover:text-ink"
        >
          <Plus className="h-3 w-3" aria-hidden />
          New hunt
        </Link>
      </div>
    </div>
  );
}
