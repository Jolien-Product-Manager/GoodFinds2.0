import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function filterSectionClassName(className?: string) {
  return cn(
    "rounded-sm border border-line-strong bg-card p-2.5 shadow-sm",
    className
  );
}

export function filterSectionLabelClassName(className?: string) {
  return cn(
    "font-mono text-[10px] uppercase tracking-wide text-ink-soft",
    className
  );
}

export function filterSectionDividerClassName(className?: string) {
  return cn("border-t border-line pt-2", className);
}

/** Horizontal hunt chips at top of feed — not sidebar table rows. */
export function filterChipClassName(selected: boolean, className?: string) {
  return cn(
    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
    selected
      ? "border-brass bg-brass/15 text-ink"
      : "border-line-strong bg-paper/50 text-ink-soft hover:border-line hover:bg-paper hover:text-ink",
    className
  );
}

export function filterChipCountClassName(className?: string) {
  return cn("ml-1.5 font-mono tabular-nums text-ink-soft", className);
}

export function filterTableRowClassName(selected: boolean, className?: string) {
  return cn(
    "flex w-full items-center gap-2 rounded-sm border px-2 py-1 text-left text-xs transition-colors",
    selected
      ? "border-brass bg-brass/15 text-ink"
      : "border-transparent text-ink-soft hover:border-line hover:bg-paper/60 hover:text-ink",
    className
  );
}

export function filterTableCountClassName(className?: string) {
  return cn("font-mono tabular-nums text-ink-soft", className);
}

function FilterTableIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "h-3 w-3 shrink-0 rounded-[2px] border",
        selected ? "border-brass bg-brass/30" : "border-line-strong bg-card"
      )}
      aria-hidden
    />
  );
}

interface FilterTableRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  count?: number;
  children: ReactNode;
}

export function FilterTableRow({
  selected,
  count,
  children,
  className,
  ...props
}: FilterTableRowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={filterTableRowClassName(selected, className)}
      {...props}
    >
      <FilterTableIndicator selected={selected} />
      <span className="min-w-0 flex-1 truncate leading-snug">{children}</span>
      {count != null && (
        <span className={filterTableCountClassName()}>{count.toLocaleString()}</span>
      )}
    </button>
  );
}

interface FilterSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function FilterSection({ label, children, className, action }: FilterSectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className={filterSectionLabelClassName()}>{label}</p>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
