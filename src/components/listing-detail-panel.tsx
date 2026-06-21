"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Sparkles,
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
  listingDescriptionText,
  listingDetailRows,
  listingSourceLabel,
} from "@/lib/listings/listing-detail";
import { getListingImageSrcs } from "@/lib/listings/image-url";
import { getTotalCost } from "@/lib/shipping";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
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
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-ink/40">
        {currentSrc && !currentFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={`${listing.title} photo ${safeIndex + 1}`}
            className="h-full w-full object-cover"
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(safeIndex);
                return next;
              })
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-card/60">
            <Square className="mr-2 h-8 w-8 opacity-40" strokeWidth={1.25} />
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
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-ink/70 text-card hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={safeIndex >= imageSrcs.length - 1}
              onClick={() => setIndex((i) => Math.min(imageSrcs.length - 1, i + 1))}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-ink/70 text-card hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imageSrcs.map((src, thumbIndex) => (
            <button
              key={`${listing.id}-thumb-${thumbIndex}`}
              type="button"
              aria-label={`Show photo ${thumbIndex + 1}`}
              onClick={() => setIndex(thumbIndex)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border-2 bg-ink/30",
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
  const matchScore = match && match.score > 0 ? match.score : null;
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
        "flex h-full max-h-[100dvh] flex-col overflow-hidden bg-ink text-card shadow-xl md:max-h-[calc(100vh-2rem)] md:rounded-sm md:border md:border-line-strong",
        className
      )}
      aria-label="Listing details"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-card/10 px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2 text-card/80 hover:bg-card/10 hover:text-card"
          >
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {positionLabel ? (
            <span className="font-mono text-xs tabular-nums text-card/60">
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
            className="h-8 w-8 text-card/80 hover:bg-card/10 hover:text-card disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!onNext}
            onClick={onNext}
            aria-label="Next listing"
            className="h-8 w-8 text-card/80 hover:bg-card/10 hover:text-card disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <DetailPhotoGallery listing={listing} />

        <div className="mt-4 space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold leading-snug text-card">
              {listing.title}
            </h2>
            <p className="mt-1.5 text-sm text-card/65">
              {listingSourceLabel(listing.source)}
              {metaLine ? ` · ${metaLine}` : ""}
            </p>
          </div>

          <div className="rounded-sm border border-card/10 bg-card/5 px-3 py-3">
            <p className="font-display text-3xl font-semibold tabular-nums text-card">
              ${costs.total.toFixed(2)}
            </p>
            <p className="mt-1 font-mono text-xs text-card/65">
              ${costs.item.toFixed(2)} + ${costs.shipping.toFixed(2)} shipping
              {!costs.shippingConfirmed && " (est.)"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-card/10 px-2 py-0.5 text-card/80">
                {listing.condition}
              </span>
              {matchScore != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-steal/20 px-2 py-0.5 text-card">
                  <span className="h-1.5 w-1.5 rounded-full bg-brass" />
                  Match {Math.round(matchScore * 10)}
                </span>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <dl className="space-y-2.5 border-t border-card/10 pt-4">
              {rows.slice(0, 8).map(({ label, value }) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,34%)_1fr] gap-x-3 gap-y-0.5"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-card/50">
                    {label}
                  </dt>
                  <dd className="text-sm text-card/90">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Button
            type="button"
            className="h-10 w-full rounded-sm bg-card/15 text-card hover:bg-card/25"
            asChild
          >
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              Visit listing
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between border-t border-card/10 py-3 text-left">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-card/60">
                <FileText className="h-3.5 w-3.5" />
                Description
              </span>
              <ChevronDown className="h-4 w-4 text-card/50" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="pb-4 text-sm leading-relaxed text-card/75 whitespace-pre-wrap break-words">
                {description}
              </p>
            </CollapsibleContent>
          </Collapsible>

          {match?.whyNote && (
            <div className="border-t border-card/10 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-brass">
                Why it surfaced
              </p>
              <p className="mt-2 border-l-2 border-brass/60 pl-3 text-sm italic leading-relaxed text-card/75">
                {match.whyNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {(onToggleInterested || onDismiss) && (
        <div className="flex shrink-0 gap-2 border-t border-card/10 p-4">
          {onToggleInterested && (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-9 flex-1 border-card/20 bg-transparent text-card hover:bg-card/10",
                interested && "border-steal/40 text-steal"
              )}
              onClick={onToggleInterested}
            >
              <Sparkles className={cn("mr-1.5 h-4 w-4", interested && "fill-steal/20")} />
              {interested ? "Unsave" : "Save"}
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 border-card/20 bg-transparent text-card/80 hover:bg-card/10 hover:text-card"
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
