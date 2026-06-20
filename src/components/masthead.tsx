"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useCasebackStore } from "@/store/caseback";

export function Masthead() {
  const unseenCount = useCasebackStore((s) => s.seen.length);

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            Sleeper
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/"
              className="font-medium text-ink underline decoration-brass decoration-2 underline-offset-4"
            >
              Feed
              {unseenCount >= 0 && (
                <Badge variant="outline" className="ml-2 border-brass text-brass">
                  inbox
                </Badge>
              )}
            </Link>
            <Link
              href="/hunts"
              className="text-ink-soft hover:text-ink"
            >
              Hunts
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
