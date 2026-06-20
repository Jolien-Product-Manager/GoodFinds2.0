"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Square, Star, X } from "lucide-react";
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
  storeFind: "Store find",
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
    case "storeFind":
      return f.storeFind;
    default:
      return undefined;
  }
}

function attributeTagLabel(match: AttributeMatch, listing: AppListing): string {
  const short = ATTR_SHORT[match.key as AttrKey];
  const full = ATTR_OPTIONS[match.key as AttrKey]?.label ?? match.label;

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
  compact,
}: {
  listing: AppListing;
  compact: boolean;
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
  const anyLoaded = imageSrcs.some((_, i) => !failed.has(i));

  if (imageSrcs.length === 0 || !anyLoaded) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#c9b896]/35">
        <Square className="h-10 w-10 text-ink/15" strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-0 bg-[#c9b896]/20">
        {currentSrc && !currentFailed ? (
          <Image
            src={currentSrc}
            alt={`${listing.title} photo ${safeIndex + 1}`}
            fill
            className="object-cover"
            sizes={
              compact ? "(max-width: 640px) 50vw, 25vw" : "(max-width: 680px) 100vw, 33vw"
            }
            unoptimized
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(safeIndex);
                return next;
              })
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#c9b896]/35 text-xs text-ink-soft">
            Photo unavailable
          </div>
        )}
      </div>

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
    </>
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
  const isUnverified = match.status === "unverified";

  if (!isHit && !isUnverified) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] leading-none",
        isHit && "border border-line-strong bg-brass/10 text-ink",
        isUnverified && "border border-dashed border-line bg-card/50 text-ink-soft"
      )}
    >
      {isHit ? (
        <Check className="h-3 w-3 shrink-0 text-brass" strokeWidth={2.5} />
      ) : (
        <Square className="h-3 w-3 shrink-0 opacity-40" strokeWidth={1.5} />
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
  const bestHuntName =
    match?.scoreBreakdown?.bestHuntName ?? match?.matchedHuntNames[0];
  const attributeMatches = match?.attributeMatches ?? [];
  const visibleAttributes = attributeMatches.filter(
    (m) => m.status === "hit" || m.status === "unverified"
  );
  const showMatchFooter = Boolean(bestHuntName && match && match.score > 0);

  const metaLine = [listing.features.era, listing.year].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm",
        muted && "opacity-60"
      )}
    >
      <div className={cn("relative", compact ? "aspect-[4/3]" : "aspect-[4/3]")}>
        <ListingPhotoCarousel listing={listing} compact={compact} />

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

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-ink-soft">To door</span>
            <span
              className={cn(
                "font-display font-semibold tabular-nums text-ink",
                compact ? "text-xl" : "text-2xl"
              )}
            >
              ${costs.total.toFixed(2)}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 text-right text-ink-soft",
              compact ? "text-[11px]" : "text-xs"
            )}
          >
            ${costs.item.toFixed(2)} + ${costs.shipping.toFixed(2)} shipping
            {!costs.shippingConfirmed && " (est.)"}
          </p>
        </div>

        <div className={cn("flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
          <span className="text-ink-soft">Condition</span>
          <span className="rounded-full bg-brass/12 px-2.5 py-0.5 text-[11px] font-medium text-ink">
            {conditionLabel}
          </span>
        </div>

        {showMatchFooter && (
          <div className="border-t border-line pt-2.5">
            <p className={cn("flex items-center gap-2 text-ink-soft", compact ? "text-xs" : "text-sm")}>
              <Check className="h-3.5 w-3.5 shrink-0 text-brass" strokeWidth={2.5} />
              <span>
                Matches your{" "}
                <span className="font-medium text-steal">{bestHuntName}</span> hunt
              </span>
            </p>

            {visibleAttributes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {visibleAttributes.map((m) => (
                  <AttributeTag key={m.key} match={m} listing={listing} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className={cn("mt-auto flex gap-2", compact ? "pt-1" : "pt-2")}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 rounded-lg border-line-strong bg-card text-ink hover:bg-paper",
              compact && "h-8 text-xs",
              interested && "border-steal/40 bg-steal/5 text-steal"
            )}
            onClick={onToggleInterested}
          >
            <Star className={cn("mr-1.5 h-3.5 w-3.5", interested && "fill-steal")} />
            {interested ? "Starred" : "Star"}
          </Button>
          {onDismiss && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 rounded-lg border-line-strong bg-card text-ink hover:bg-paper",
                compact && "h-8 text-xs"
              )}
              onClick={onDismiss}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Dismiss
            </Button>
          )}
          {onRestore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 rounded-lg border-line-strong bg-card text-ink hover:bg-paper",
                compact && "h-8 text-xs"
              )}
              onClick={onRestore}
            >
              Restore
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className={cn(
              "flex-1 rounded-lg bg-ink text-card hover:bg-ink/90",
              compact && "h-8 text-xs"
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
    </article>
  );
}
