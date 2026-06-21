"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { GlobalFilters } from "@/lib/hunts/types";
import {
  CONDITION_FILTER_OPTIONS,
  DEFAULT_ALLOWED_CONDITIONS,
  toggleAllowedCondition,
} from "@/lib/listings/condition-filter";
import {
  filterSectionDividerClassName,
  filterSectionLabelClassName,
} from "@/components/filter-chip";
import { cn } from "@/lib/utils";

interface FeedGlobalFiltersProps {
  globalFilters: GlobalFilters;
  savedGlobalFilters: GlobalFilters;
  onChange: (filters: Partial<GlobalFilters>) => void;
  className?: string;
}

function conditionsEqual(
  a: GlobalFilters["allowedConditions"],
  b: GlobalFilters["allowedConditions"]
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((value) => right.includes(value));
}

export function hasCustomGlobalFilters(
  globalFilters: GlobalFilters,
  savedGlobalFilters: GlobalFilters
): boolean {
  if (globalFilters.priceCeiling !== savedGlobalFilters.priceCeiling) return true;
  return !conditionsEqual(
    globalFilters.allowedConditions,
    savedGlobalFilters.allowedConditions
  );
}

export function FeedGlobalFilters({
  globalFilters,
  savedGlobalFilters,
  onChange,
  className,
}: FeedGlobalFiltersProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const allowedConditions = globalFilters.allowedConditions ?? [];
  const hasCustomConditions = !conditionsEqual(
    allowedConditions,
    savedGlobalFilters.allowedConditions
  );

  return (
    <div className={cn("space-y-0", className)}>
      <Collapsible
        open={priceOpen}
        onOpenChange={setPriceOpen}
        className={filterSectionDividerClassName()}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-0.5 py-0.5 text-left transition-colors">
          <span className={filterSectionLabelClassName()}>Price</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-200",
              priceOpen && "rotate-180"
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-1.5 data-[state=closed]:overflow-hidden">
          <div className="rounded-sm border border-line bg-paper/40 px-2 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">Max cost shipped to you</p>
                <p className="mt-0.5 text-[11px] text-ink-soft">Max landed cost, all in</p>
              </div>
              <div className="flex h-8 w-[7.5rem] shrink-0 items-center rounded-md border border-line-strong bg-card px-2">
                <span className="shrink-0 text-xs text-ink-soft">$</span>
                <input
                  type="number"
                  min={0}
                  value={globalFilters.priceCeiling ?? ""}
                  onChange={(e) =>
                    onChange({
                      priceCeiling: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="—"
                  className="min-w-0 flex-1 border-0 bg-transparent px-1.5 text-sm text-ink outline-none placeholder:text-ink-soft/60"
                  aria-label="Max cost shipped to you in CAD"
                />
                <span className="shrink-0 text-[11px] text-ink-soft">CAD</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        open={conditionOpen}
        onOpenChange={setConditionOpen}
        className={filterSectionDividerClassName()}
      >
        <div className="flex items-center justify-between gap-2 px-0.5">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-2 py-0.5 text-left transition-colors">
            <span className={filterSectionLabelClassName()}>Condition</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {hasCustomConditions && (
                <span className="rounded-sm border border-brass/30 bg-brass/15 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-ink">
                  {allowedConditions.length}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-200",
                  conditionOpen && "rotate-180"
                )}
                aria-hidden
              />
            </span>
          </CollapsibleTrigger>
          {hasCustomConditions && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  allowedConditions: savedGlobalFilters.allowedConditions,
                })
              }
              className="shrink-0 text-xs text-brass underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <CollapsibleContent className="space-y-1 pt-1.5 data-[state=closed]:overflow-hidden">
          <div className="rounded-sm border border-line bg-paper/40 px-2 py-2">
            <p className="text-[11px] text-ink-soft">
              Only show listings in conditions you&apos;re okay with
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONDITION_FILTER_OPTIONS.map((option) => {
                const selected = allowedConditions.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.hint}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        allowedConditions: toggleAllowedCondition(
                          allowedConditions,
                          option.value
                        ),
                      })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-brass bg-brass/15 text-ink"
                        : "border-line-strong bg-card text-ink-soft hover:border-line hover:text-ink"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
