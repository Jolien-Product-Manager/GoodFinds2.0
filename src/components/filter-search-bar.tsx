"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  className?: string;
}

export function FilterSearchBar({
  value,
  onChange,
  placeholder,
  onFocus,
  className,
}: FilterSearchBarProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
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
  return labels.some((label) => label.toLowerCase().includes(q));
}
