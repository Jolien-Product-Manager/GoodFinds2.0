"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { GlobalFilters } from "@/lib/hunts/types";
import {
  CONDITION_FILTER_OPTIONS,
  toggleAllowedCondition,
} from "@/lib/listings/condition-filter";
import { cn } from "@/lib/utils";

interface GlobalFiltersSectionProps {
  globalFilters: GlobalFilters;
  onChange: (filters: Partial<GlobalFilters>) => void;
  className?: string;
}

function FilterCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-sm border border-line-strong bg-card px-3 py-2",
        className
      )}
    >
      {children}
    </li>
  );
}

export function GlobalFiltersSection({
  globalFilters,
  onChange,
  className,
}: GlobalFiltersSectionProps) {
  const allowedConditions = globalFilters.allowedConditions ?? [];

  return (
    <section className={cn("space-y-2", className)}>
      <header>
        <h2 className="font-display text-lg font-medium text-ink">Global filters</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Applied to every hunt — listings that fail these never show up
        </p>
      </header>

      <ul className="space-y-1.5">
        <FilterCard>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-base font-medium leading-tight text-ink">
                Max cost shipped to you
              </p>
              <p className="mt-0.5 text-xs italic leading-snug text-ink-soft">
                Max landed cost, all in
              </p>
            </div>
            <div className="flex h-8 w-[7.5rem] shrink-0 items-center rounded-md border border-line-strong bg-white px-2">
              <span className="shrink-0 text-xs text-ink-soft">$</span>
              <input
                id="price-ceiling"
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
              />
              <span className="shrink-0 text-[11px] text-ink-soft">CAD</span>
            </div>
          </div>
        </FilterCard>

        <FilterCard>
          <div>
            <p className="font-display text-base font-medium leading-tight text-ink">
              Condition
            </p>
            <p className="mt-0.5 text-xs italic leading-snug text-ink-soft">
              Only show listings in conditions you&apos;re okay with
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
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
                      : "border-line-strong bg-white text-ink-soft hover:border-line hover:text-ink"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </FilterCard>

        <FilterCard>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-base font-medium leading-tight text-ink">
                Ships to my address
              </p>
              {globalFilters.shipsToMe ? (
                <p className="mt-0.5 text-xs italic leading-snug text-ink-soft">
                  Estimates shipping + duties for ceiling
                </p>
              ) : null}
            </div>
            <Switch
              id="ships-to-me"
              checked={globalFilters.shipsToMe}
              onCheckedChange={(v) => onChange({ shipsToMe: v })}
            />
          </div>

          {globalFilters.shipsToMe && (
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
              <label
                htmlFor="postal"
                className="shrink-0 text-xs text-ink-soft"
              >
                Postal
              </label>
              <Input
                id="postal"
                value={globalFilters.postalCode ?? ""}
                onChange={(e) => onChange({ postalCode: e.target.value })}
                placeholder="M6K 1V8"
                className="h-8 flex-1 border-line-strong bg-white text-sm"
              />
            </div>
          )}
        </FilterCard>
      </ul>
    </section>
  );
}
