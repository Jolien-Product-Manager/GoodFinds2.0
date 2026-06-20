"use client";

import { Heart } from "lucide-react";
import type { HuntHearts } from "@/lib/hunts/types";
import { cn } from "@/lib/utils";

export const HUNT_HEARTS_MIN = 1;
export const HUNT_HEARTS_MAX = 4;

interface HuntHeartsPickerProps {
  value: number;
  onChange?: (hearts: HuntHearts) => void;
  size?: "sm" | "xs";
  className?: string;
}

export function HuntHeartsPicker({
  value,
  onChange,
  size = "sm",
  className,
}: HuntHeartsPickerProps) {
  const clamped = Math.min(HUNT_HEARTS_MAX, Math.max(HUNT_HEARTS_MIN, value));
  const iconClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const interactive = onChange != null;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "group" : undefined}
      aria-label={`${clamped} of ${HUNT_HEARTS_MAX} hearts`}
    >
      {Array.from({ length: HUNT_HEARTS_MAX }, (_, i) => i + 1).map((n) => {
        const filled = n <= clamped;
        const heart = (
          <Heart
            className={cn(
              iconClass,
              filled ? "fill-steal text-steal" : "text-ink-soft/50"
            )}
          />
        );

        if (!interactive) {
          return (
            <span key={n} aria-hidden="true">
              {heart}
            </span>
          );
        }

        return (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(n as HuntHearts);
            }}
            aria-label={`Set to ${n} heart${n > 1 ? "s" : ""}`}
            className="rounded-sm p-0.5 transition-colors hover:bg-steal/10"
          >
            {heart}
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated Use HuntHeartsPicker */
export const HuntPriorityHearts = HuntHeartsPicker;
