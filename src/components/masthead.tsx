"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Feed" },
  { href: "/hunts", label: "Hunts" },
] as const;

export function Masthead() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            GoodFinds
          </Link>
          <nav className="flex gap-4 text-sm">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    active
                      ? "font-medium text-ink underline decoration-brass decoration-2 underline-offset-4"
                      : "text-ink-soft hover:text-ink"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
