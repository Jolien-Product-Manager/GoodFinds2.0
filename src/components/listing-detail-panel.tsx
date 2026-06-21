"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AppListing } from "@/lib/listings/types";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";
import {
  matchQualityDotClass,
  matchQualityFromResult,
} from "@/lib/listings/hunt-match";
import {
  listingDescriptionText,
  listingDetailRows,
} from "@/lib/listings/listing-detail";
import { getListingImageSrcs } from "@/lib/listings/image-url";
import { getTotalCost } from "@/lib/shipping";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { MarketplaceIcon } from "@/components/marketplace-logo";
import { cn } from "@/lib/utils";

function DetailPhotoGallery({ listing }: { listing: AppListing }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const urls =
    (listing.imageUrls ?? []).length > 0
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];
  const imageSrcs = getListingImageSrcs(urls, 12);
  const safeIndex = Math.min(index, Math.max(0, imageSrcs.length - 1));
  const currentSrc = imageSrcs[safeIndex];
  const currentFailed = failed.has(safeIndex);
  const hasMultiple = imageSrcs.length > 1;

  useEffect(() => {
    setIndex(0);
    setFailed(new Set());
  }, [listing.id]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-paper/60">
        {currentSrc && !currentFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={`${listing.title} photo ${safeIndex + 1}`}
            className="h-full w-full object-contain object-center"
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(safeIndex);
                return next;
              })
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-soft">
            <Square className="mr-2 h-6 w-6 opacity-40" strokeWidth={1.25} />
            Photo unavailable
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={safeIndex === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-ink/70 text-card hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={safeIndex >= imageSrcs.length - 1}
              onClick={() => setIndex((i) => Math.min(imageSrcs.length - 1, i + 1))}
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-ink/70 text-card hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {imageSrcs.map((src, thumbIndex) => (
            <button
              key={`${listing.id}-thumb-${thumbIndex}`}
              type="button"
              aria-label={`Show photo ${thumbIndex + 1}`}
              onClick={() => setIndex(thumbIndex)}
              className={cn(
                "relative h-11 w-11 shrink-0 overflow-hidden rounded-sm border-2 bg-paper/80",
                thumbIndex === safeIndex ? "border-brass" : "border-transparent opacity-70"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ListingDetailPanelProps {
  listing: AppListing;
  match?: HuntMatchResult;
  positionLabel?: string;
  interested?: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToggleInterested?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ListingDetailPanel({
  listing,
  match,
  positionLabel,
  interested = false,
  onClose,
  onPrevious,
  onNext,
  onToggleInterested,
  onDismiss,
  className,
}: ListingDetailPanelProps) {
  const costs = getTotalCost(listing, DEFAULT_CRITERIA.postalCode);
  const rows = listingDetailRows(listing);
  const description = listingDescriptionText(listing);
  const matchQuality = match ? matchQualityFromResult(match) : null;
  const metaLine = [listing.features.era, listing.year].filter(Boolean).join(" · ");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious?.();
      if (event.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrevious]);

  return (
    <aside
      className={cn(
        "flex h-full max-h-[100dvh] flex-col overflow-hidden border border-line-strong bg-card text-ink shadow-sm md:max-h-[calc(100vh-2rem)] md:rounded-sm",
        className
      )}
      aria-label="Listing details"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-1.5 text-xs text-ink-soft hover:bg-paper hover:text-ink"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Close
          </Button>
        </div>

        <div className="flex items-center gap-0.5">
          {positionLabel ? (
            <span className="font-mono text-[10px] tabular-nums text-ink-soft">
              {positionLabel}
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!onPrevious}
            onClick={onPrevious}
            aria-label="Previous listing"
            className="h-7 w-7 text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!onNext}
            onClick={onNext}
            aria-label="Next listing"
            className="h-7 w-7 text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <DetailPhotoGallery listing={listing} />

        <div className="mt-3 space-y-2.5">
          <div>
            <h2 className="font-display text-base font-semibold leading-snug text-ink">
              {listing.title}
            </h2>
            {metaLine ? (
              <p className="mt-1 text-xs text-ink-soft">{metaLine}</p>
            ) : null}
          </div>

          <div className="rounded-sm border border-line bg-paper/60 px-2.5 py-2">
            <div className="flex flex-col items-start gap-0.5">
              <p className="font-display text-2xl font-semibold tabular-nums text-ink">
                ${costs.total.toFixed(2)}
              </p>
              <MarketplaceIcon source={listing.source} />
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
              ${costs.item.toFixed(2)} + ${costs.shipping.toFixed(2)} shipping
              {!costs.shippingConfirmed && " (est.)"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="rounded-full border border-line bg-card px-1.5 py-0.5 text-ink-soft">
                {listing.condition}
              </span>
              {matchQuality != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-1.5 py-0.5 text-ink">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      matchQualityDotClass(matchQuality.level)
                    )}
                  />
                  {matchQuality.label}
                </span>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <dl className="space-y-1.5 border-t border-line pt-2.5">
              {rows.slice(0, 8).map(({ label, value }) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,34%)_1fr] gap-x-2 gap-y-0"
                >
                  <dt className="font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                    {label}
                  </dt>
                  <dd className="text-xs leading-snug text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Button
            type="button"
            className="h-8 w-full rounded-sm border border-line-strong bg-paper text-xs text-ink hover:bg-paper/80"
            asChild
          >
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              Visit listing
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>

          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between border-t border-line py-2 text-left">
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                <FileText className="h-3 w-3" />
                Description
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="pb-2.5 text-xs leading-relaxed text-ink-soft whitespace-pre-wrap break-words">
                {description}
              </p>
            </CollapsibleContent>
          </Collapsible>

          {match?.whyNote && (
            <div className="border-t border-line pt-2.5">
              <p className="font-mono text-[9px] uppercase tracking-wide text-brass">
                Why it surfaced
              </p>
              <p className="mt-1 border-l-2 border-brass/60 pl-2.5 text-xs italic leading-relaxed text-ink-soft">
                {match.whyNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {(onToggleInterested || onDismiss) && (
        <div className="flex shrink-0 gap-1.5 border-t border-line p-3">
          {onToggleInterested && (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-8 flex-1 border-line-strong bg-card text-xs text-ink hover:bg-paper",
                interested && "border-steal/40 text-steal"
              )}
              onClick={onToggleInterested}
              aria-label={interested ? "Unsave listing" : "Save listing"}
              aria-pressed={interested}
            >
              <Heart className={cn("mr-1 h-3.5 w-3.5", interested && "fill-current")} />
              {interested ? "Saved" : "Save"}
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 border-line-strong bg-card text-xs text-ink-soft hover:bg-paper hover:text-ink"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
