"use client";

import type { ListingSource } from "@/lib/listings/types";
import { listingSourceLabel } from "@/lib/listings/listing-detail";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface MarketplaceLogoProps {
  source: ListingSource;
  className?: string;
}

function EbayShoppingBag({ className }: { className?: string }) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 20 22"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path
        d="M6.5 7.5C6.5 5 13.5 5 13.5 7.5"
        fill="none"
        stroke="#2A2118"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <clipPath id={clipId}>
          <path d="M4.5 8.5h11v10.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V8.5z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="4.5" y="8.5" width="2.75" height="14.5" fill="#E53238" />
        <rect x="7.25" y="8.5" width="2.75" height="14.5" fill="#0064D2" />
        <rect x="10" y="8.5" width="2.75" height="14.5" fill="#F5AF02" />
        <rect x="12.75" y="8.5" width="2.75" height="14.5" fill="#86B817" />
      </g>
    </svg>
  );
}

function Chrono24Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-3.5 w-auto", className)}
      aria-hidden
    >
      <circle cx="7" cy="8" r="5.5" fill="none" stroke="#2A2118" strokeWidth="1.25" />
      <path
        d="M7 5.5V8l2 1.2"
        fill="none"
        stroke="#2A2118"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <text
        x="16"
        y="11.5"
        fontSize="11"
        fontWeight="600"
        fill="#2A2118"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="-0.2"
      >
        chrono24
      </text>
    </svg>
  );
}

function EtsyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-3.5 w-auto", className)}
      aria-hidden
    >
      <text
        x="0"
        y="12.5"
        fontSize="14"
        fontWeight="600"
        fill="#F56400"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        Etsy
      </text>
    </svg>
  );
}

function Chrono24Icon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke="#2A2118" strokeWidth="1.25" />
      <path
        d="M8 5.5V8l2.25 1.35"
        fill="none"
        stroke="#2A2118"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EtsyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.5" fill="#F56400" />
      <text
        x="8"
        y="11.5"
        fontSize="9"
        fontWeight="700"
        fill="#F4EFE4"
        fontFamily="Georgia, 'Times New Roman', serif"
        textAnchor="middle"
      >
        E
      </text>
    </svg>
  );
}

export function MarketplaceIcon({ source, className }: MarketplaceLogoProps) {
  const label = listingSourceLabel(source);

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      {source === "ebay" && <EbayShoppingBag />}
      {source === "chrono24" && <Chrono24Icon />}
      {source === "etsy" && <EtsyIcon />}
    </span>
  );
}

export function MarketplaceLogo({ source, className }: MarketplaceLogoProps) {
  const label = listingSourceLabel(source);

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      {source === "ebay" && <EbayShoppingBag />}
      {source === "chrono24" && <Chrono24Logo />}
      {source === "etsy" && <EtsyLogo />}
    </span>
  );
}
