import type { ListingSource } from "@/lib/listings/types";
import { listingSourceLabel } from "@/lib/listings/listing-detail";
import { cn } from "@/lib/utils";

interface MarketplaceLogoProps {
  source: ListingSource;
  className?: string;
}

function EbayLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-3.5 w-auto", className)}
      aria-hidden
    >
      <text
        x="0"
        y="12.5"
        fontSize="14"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        <tspan fill="#E53238">e</tspan>
        <tspan fill="#0064D2">b</tspan>
        <tspan fill="#F5AF02">a</tspan>
        <tspan fill="#86B817">y</tspan>
      </text>
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

function EbayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-3.5 w-auto", className)}
      aria-hidden
    >
      <text
        x="0"
        y="12.5"
        fontSize="14"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        <tspan fill="#E53238">e</tspan>
        <tspan fill="#0064D2">b</tspan>
        <tspan fill="#F5AF02">a</tspan>
        <tspan fill="#86B817">y</tspan>
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
      {source === "ebay" && <EbayIcon />}
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
      {source === "ebay" && <EbayLogo />}
      {source === "chrono24" && <Chrono24Logo />}
      {source === "etsy" && <EtsyLogo />}
    </span>
  );
}
