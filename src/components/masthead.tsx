"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Listings" },
  { href: "/hunts", label: "Hunts" },
] as const;

export function Masthead() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:max-w-7xl">
        <div className="flex min-w-0 items-center gap-5 sm:gap-8">
          <Link href="/" className="shrink-0" aria-label="GoodFinds home">
            <Image
              src="/goodfinds-logo.png"
              alt="GoodFinds — Timex Vintage"
              width={480}
              height={320}
              className="h-11 w-auto sm:h-12"
              priority
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-sm px-2.5 py-1.5 text-sm transition-colors sm:px-3",
                    active
                      ? "bg-brass/15 font-medium text-ink"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
