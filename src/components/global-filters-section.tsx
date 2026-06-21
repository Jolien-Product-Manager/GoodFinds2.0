"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { GlobalFilters } from "@/lib/hunts/types";
import { cn } from "@/lib/utils";

interface GlobalFiltersSectionProps {
  globalFilters: GlobalFilters;
  onChange: (filters: Partial<GlobalFilters>) => void;
  className?: string;
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-xs leading-snug text-ink-soft">{children}</p>
  );
}

function FilterField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function GlobalFiltersSection({
  globalFilters,
  onChange,
  className,
}: GlobalFiltersSectionProps) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-sm border border-line-strong bg-card px-3 py-2.5",
        className
      )}
    >
      <header>
        <h2 className="font-display text-lg font-medium text-ink">Global filters</h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          Applied to every hunt — listings that fail these never show up
        </p>
      </header>

      <FilterField
        label="Price ceiling"
        description="The most you'll pay to get a watch to your door, all in"
      >
        <div className="flex h-9 max-w-xs items-center rounded-md border border-line-strong bg-white px-2.5">
          <span className="shrink-0 text-sm text-ink-soft">$</span>
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
            placeholder="No limit"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-ink-soft/60"
          />
          <span className="shrink-0 text-sm text-ink-soft">CAD</span>
        </div>
      </FilterField>

      <hr className="border-line" />

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">Ships to my address</p>
          <Switch
            id="ships-to-me"
            checked={globalFilters.shipsToMe}
            onCheckedChange={(v) => onChange({ shipsToMe: v })}
          />
        </div>

        {globalFilters.shipsToMe && (
          <div className="mt-2">
            <p className="text-xs font-medium text-ink">Postal code</p>
            <Input
              id="postal"
              value={globalFilters.postalCode ?? ""}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              placeholder="M6K 1V8"
              className="mt-1 h-9 max-w-xs border-line-strong bg-white text-sm"
            />
            <InfoNote>
              Lets us estimate shipping + duties so the ceiling uses true landed
              cost
            </InfoNote>
          </div>
        )}
      </div>
    </section>
  );
}
