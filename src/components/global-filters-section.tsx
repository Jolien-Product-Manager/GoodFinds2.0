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
    <div className="mt-3 flex items-start gap-2.5">
      <span
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border border-line-strong bg-white"
        aria-hidden
      />
      <p className="text-sm leading-snug text-ink-soft">{children}</p>
    </div>
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
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
      <div className="mt-3">{children}</div>
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
        "space-y-6 rounded-lg border border-line bg-card p-6",
        className
      )}
    >
      <header>
        <h2 className="font-display text-xl font-medium text-ink">Global filters</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Applied to every hunt — listings that fail these never show up
        </p>
      </header>

      <FilterField
        label="Price ceiling"
        description="The most you'll pay to get a watch to your door, all in"
      >
        <div className="flex h-10 items-center rounded-md border border-line-strong bg-white px-3">
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-ink">Ships to my address</p>
          </div>
          <Switch
            id="ships-to-me"
            checked={globalFilters.shipsToMe}
            onCheckedChange={(v) => onChange({ shipsToMe: v })}
            className="mt-0.5"
          />
        </div>

        {globalFilters.shipsToMe && (
          <div className="mt-4 border-l border-line pl-4">
            <p className="text-sm font-medium text-ink">Postal code</p>
            <Input
              id="postal"
              value={globalFilters.postalCode ?? ""}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              placeholder="M6K 1V8"
              className="mt-2 border-line-strong bg-white"
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
