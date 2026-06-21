"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onSubmit?: () => void;
  className?: string;
}

export function FilterSearchBar({
  value,
  onChange,
  placeholder,
  onFocus,
  onSubmit,
  className,
}: FilterSearchBarProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit?.();
        }
      }}
      placeholder={placeholder}
      className={cn(
        "h-8 border-line-strong bg-paper text-xs text-ink placeholder:text-ink-soft/70",
        className
      )}
    />
  );
}

export function matchesFilterSearch(query: string, ...labels: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const qCompact = q.replace(/[\s_./-]+/g, "");
  return labels.some((label) => {
    const lower = label.toLowerCase();
    if (lower.includes(q)) return true;
    const compact = lower.replace(/[\s_./-]+/g, "");
    return compact.includes(qCompact) || compact === qCompact;
  });
}
