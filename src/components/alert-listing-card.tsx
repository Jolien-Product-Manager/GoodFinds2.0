"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppListing } from "@/lib/listings/types";
import type { AttributeMatch, HuntMatchResult } from "@/lib/listings/hunt-match";
import { FEED_SCORE_MAX } from "@/lib/listings/hunt-match";
import { ATTR_OPTIONS, type AttrKey } from "@/lib/hunts/types";
import { getListingImageSrcs } from "@/lib/listings/image-url";
import { getTotalCost } from "@/lib/shipping";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { cn } from "@/lib/utils";

const ATTR_SHORT: Partial<Record<AttrKey, string>> = {
  dial: "Dial",
  color: "Colour",
  collab: "Collab",
  era: "Era",
  model: "Model",
  case: "Case",
  mvmt: "Movement",
  cond: "Condition",
  traits: "Trait",
};

function listingFeatureValue(listing: AppListing, key: string): string | undefined {
  const f = listing.features;
  switch (key) {
    case "model":
      return f.model ?? listing.model ?? undefined;
    case "collab":
      return f.collab;
    case "dial":
      return f.dial;
    case "color":
      return f.color;
    case "era":
      return f.era;
    case "case":
      return f.case;
    case "mvmt":
      return f.mvmt;
    case "cond":
      return f.cond;
    case "traits":
      return undefined;
    default:
      return undefined;
  }
}

function attributeTagLabel(match: AttributeMatch, listing: AppListing): string {
  const short = ATTR_SHORT[match.key as AttrKey];
  const full = ATTR_OPTIONS[match.key as AttrKey]?.label ?? match.label;

  if (match.key === "traits") {
    return match.label;
  }

  if (match.status === "hit") {
    return listingFeatureValue(listing, match.key) ?? short ?? full;
  }
  if (match.status === "unverified") {
    return `${short ?? full}?`;
  }
  return short ?? full;
}

function matchQualityLabel(score: number): string {
  if (score >= FEED_SCORE_MAX * 0.5) return "Good match";
  if (score > 0) return "Match";
  return "";
}

function ListingPhotoCarousel({
  listing,
}: {
  listing: AppListing;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const urls =
    (listing.imageUrls ?? []).length > 0
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];
  const imageSrcs = getListingImageSrcs(urls);
  const safeIndex = Math.min(index, Math.max(0, imageSrcs.length - 1));
  const currentSrc = imageSrcs[safeIndex];
  const currentFailed = failed.has(safeIndex);
  const hasMultiple = imageSrcs.length > 1;

  if (imageSrcs.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#c9b896]/35">
        <Square className="h-10 w-10 text-ink/15" strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {currentSrc && !currentFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied CDN URLs; native img keeps card layout stable
        <img
          src={currentSrc}
          alt={`${listing.title} photo ${safeIndex + 1}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() =>
            setFailed((prev) => {
              const next = new Set(prev);
              next.add(safeIndex);
              return next;
            })
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#c9b896]/35 text-xs text-ink-soft">
          Photo unavailable
        </div>
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            disabled={safeIndex === 0}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
            className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-ink/55 text-card hover:bg-ink/75 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={safeIndex >= imageSrcs.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(imageSrcs.length - 1, i + 1));
            }}
            className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-ink/55 text-card hover:bg-ink/75 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

function AttributeTag({
  match,
  listing,
}: {
  match: AttributeMatch;
  listing: AppListing;
}) {
  const label = attributeTagLabel(match, listing);
  const isHit = match.status === "hit";
  const isMiss = match.status === "miss";
  const isUnverified = match.status === "unverified";

  if (!isHit && !isMiss && !isUnverified) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-none font-medium",
        isHit && "bg-brass/12 text-ink",
        isMiss && "bg-steal/10 text-steal",
        isUnverified && "border border-dashed border-line bg-card/50 text-ink-soft"
      )}
    >
      {isHit ? (
        <Check className="h-2.5 w-2.5 shrink-0 text-brass" strokeWidth={2.5} />
      ) : (
        <Square className="h-2.5 w-2.5 shrink-0 opacity-50" strokeWidth={1.5} />
      )}
      {label}
    </span>
  );
}

interface AlertListingCardProps {
  listing: AppListing;
  match?: HuntMatchResult;
  interested?: boolean;
  muted?: boolean;
  compact?: boolean;
  showHuntMatchTags?: boolean;
  onDismiss?: () => void;
  onRestore?: () => void;
  onToggleInterested?: () => void;
}

export function AlertListingCard({
  listing,
  match,
  interested = false,
  muted = false,
  compact = false,
  showHuntMatchTags = false,
  onDismiss,
  onRestore,
  onToggleInterested,
}: AlertListingCardProps) {
  const costs = getTotalCost(listing, DEFAULT_CRITERIA.postalCode);
  const conditionLabel = listing.condition;
  const matchLabel = match && match.score > 0 ? matchQualityLabel(match.score) : "";
  const attributeMatches = match?.attributeMatches ?? [];
  const visibleAttributes = attributeMatches.filter(
    (m) => m.status === "hit" || m.status === "miss"
  );
  const showAttributeRow = visibleAttributes.length > 0;

  const metaLine = [listing.features.era, listing.year].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm",
        muted && "opacity-60"
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#c9b896]/20">
        <ListingPhotoCarousel listing={listing} />

        <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium lowercase tracking-wide text-card">
          {listing.source}
        </span>

        {matchLabel && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-card/95 px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm">
            <span className="h-2 w-2 rounded-full bg-brass" />
            {matchLabel}
          </span>
        )}

        {showHuntMatchTags && (match?.matchedHuntNames.length ?? 0) > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {match!.matchedHuntNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-ink/75 px-2 py-0.5 text-[10px] text-card"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "gap-2.5 p-3" : "gap-3 p-4")}>
        <div>
          <h3
            className={cn(
              "font-display font-semibold leading-snug text-ink",
              compact ? "line-clamp-2 text-[15px]" : "text-lg"
            )}
          >
            {listing.title}
          </h3>
          {metaLine && (
            <p className={cn("mt-1 text-ink-soft", compact ? "text-xs" : "text-sm")}>
              {metaLine}
            </p>
          )}
        </div>

        <div className="text-right">
          <span
            className={cn(
              "font-display font-semibold tabular-nums text-ink",
              compact ? "text-xl" : "text-2xl"
            )}
          >
            ${costs.total.toFixed(2)}
          </span>
          <p
            className={cn(
              "mt-0.5 text-ink-soft",
              compact ? "text-[11px]" : "text-xs"
            )}
          >
            ${costs.item.toFixed(2)} + ${costs.shipping.toFixed(2)} shipping
            {!costs.shippingConfirmed && " (est.)"}
          </p>
        </div>

        <div className={cn("flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
          <span className="text-ink-soft">Condition</span>
          <span className="rounded-full bg-brass/12 px-2 py-0.5 text-[10px] font-medium text-ink">
            {conditionLabel}
          </span>
        </div>

        <div className="mt-auto border-t border-line pt-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {onToggleInterested && (
              <button
                type="button"
                onClick={onToggleInterested}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium transition-colors",
                  interested ? "text-steal" : "text-steal/80 hover:text-steal"
                )}
              >
                {interested ? (
                  <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                ) : (
                  <Square className="h-3 w-3 shrink-0" strokeWidth={2} />
                )}
                Interesting
              </button>
            )}

            {showAttributeRow && (
              <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
                {visibleAttributes.map((m) => (
                  <AttributeTag key={m.key} match={m} listing={listing} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            {onDismiss && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border-line-strong bg-card text-ink hover:bg-paper"
                onClick={onDismiss}
                aria-label="Dismiss listing"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRestore && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md border-line-strong bg-card text-ink hover:bg-paper"
                onClick={onRestore}
                aria-label="Restore listing"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-8 min-w-0 flex-[2] rounded-md bg-ink px-3 text-xs text-card hover:bg-ink/90",
                compact && "text-xs"
              )}
              asChild
            >
              <a href={listing.url} target="_blank" rel="noopener noreferrer">
                View
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
