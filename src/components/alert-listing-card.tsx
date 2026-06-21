"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Info,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppListing } from "@/lib/listings/types";
import type { AttributeMatch, HuntMatchResult, HuntScoreContribution } from "@/lib/listings/hunt-match";
import {
  characteristicDisplayLabel,
  matchQualityDotClass,
  matchQualityCardHighlightClass,
  matchQualityFromResult,
  type MatchQuality,
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

function attributeTagLabel(match: AttributeMatch, listing: AppListing): string {
  const label = characteristicDisplayLabel(match, listing);
  if (match.status === "unverified") return `${label}?`;
  return label;
}

function NewListingTab() {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 -translate-y-1/2"
      aria-label="New listing"
    >
      <span className="inline-flex rounded-t-[6px] border border-ok/40 border-b-0 bg-ok px-3.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-card shadow-[0_2px_8px_rgba(47,72,47,0.25)]">
        New
      </span>
    </div>
  );
}

function CardFlipButton({
  flipped,
  onToggle,
  className,
}: {
  flipped: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={flipped ? "Show listing front" : "Show listing details"}
      aria-pressed={flipped}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md bg-ink/55 text-card hover:bg-ink/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steal",
        className
      )}
    >
      <Info className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

function ListingHeartButton({
  interested,
  onToggle,
  className,
}: {
  interested: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={interested ? "Unsave listing" : "Save listing"}
      aria-pressed={interested}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steal",
        interested
          ? "bg-steal text-card hover:bg-steal/90"
          : "bg-ink/55 text-card hover:bg-ink/75",
        className
      )}
    >
      <Heart
        className={cn("h-4 w-4", interested && "fill-current")}
        strokeWidth={interested ? 2.25 : 2}
      />
    </button>
  );
}

function ListingDismissButton({
  onDismiss,
  className,
}: {
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Dismiss listing"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-ink/55 text-card shadow-sm transition-colors hover:bg-ink/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steal",
        className
      )}
    >
      <X className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

function ListingRestoreButton({
  onRestore,
  className,
}: {
  onRestore: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Restore listing"
      onClick={(e) => {
        e.stopPropagation();
        onRestore();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-ink/55 text-card shadow-sm transition-colors hover:bg-ink/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steal",
        className
      )}
    >
      <Check className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

const SWIPE_DISMISS_THRESHOLD = 72;

function useSwipeToDismiss(onDismiss?: () => void) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const offsetXRef = useRef(0);
  const didSwipeRef = useRef(false);
  const dismissingRef = useRef(false);

  offsetXRef.current = offsetX;

  const reset = useCallback(() => {
    startRef.current = null;
    axisLockedRef.current = null;
    setIsDragging(false);
    if (!dismissingRef.current) {
      setOffsetX(0);
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!onDismiss || dismissingRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button, a")) return;

      startRef.current = { x: event.clientX, y: event.clientY };
      axisLockedRef.current = null;
      didSwipeRef.current = false;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onDismiss]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!onDismiss || !startRef.current || dismissingRef.current) return;

      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;

      if (!axisLockedRef.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        if (axisLockedRef.current === "vertical") {
          startRef.current = null;
          setIsDragging(false);
          return;
        }
      }

      if (axisLockedRef.current === "horizontal") {
        event.preventDefault();
        const next = Math.min(0, dx);
        offsetXRef.current = next;
        setOffsetX(next);
        if (Math.abs(next) > 10) didSwipeRef.current = true;
      }
    },
    [onDismiss]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!startRef.current || axisLockedRef.current !== "horizontal") {
        reset();
        return;
      }

      if (offsetXRef.current <= -SWIPE_DISMISS_THRESHOLD && onDismiss) {
        dismissingRef.current = true;
        didSwipeRef.current = true;
        setOffsetX(-120);
        window.setTimeout(() => onDismiss(), 180);
        return;
      }

      reset();
    },
    [onDismiss, reset]
  );

  const handleClickCapture = useCallback((event: MouseEvent) => {
    if (didSwipeRef.current) {
      event.preventDefault();
      event.stopPropagation();
      didSwipeRef.current = false;
    }
  }, []);

  const swipeStyle: CSSProperties | undefined = onDismiss
    ? {
        transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
        opacity: offsetX < 0 ? Math.max(0.35, 1 + offsetX / 200) : undefined,
        transition: isDragging ? "none" : "transform 0.18s ease, opacity 0.18s ease",
      }
    : undefined;

  const swipeHandlers = onDismiss
    ? {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: reset,
        onClickCapture: handleClickCapture,
      }
    : {};

  return {
    swipeHandlers,
    swipeStyle,
    touchAction: onDismiss ? ("pan-y" as const) : undefined,
  };
}

function ListingPhotoArea({
  listing,
  interested,
  isNew,
  onToggleInterested,
  onDismiss,
  onRestore,
  extraControls,
}: {
  listing: AppListing;
  interested?: boolean;
  isNew?: boolean;
  onToggleInterested?: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
  extraControls?: ReactNode;
}) {
  const hasLeftControls = Boolean(onToggleInterested || extraControls);
  const hasRightControls = Boolean(onDismiss || onRestore);

  return (
    <div
      className={cn(
        "flex shrink-0 items-start gap-2 px-3",
        isNew ? "pt-6" : "pt-3"
      )}
    >
      {hasLeftControls ? (
        <div className="flex shrink-0 flex-col items-center gap-2">
          {onToggleInterested && (
            <ListingHeartButton
              interested={interested ?? false}
              onToggle={onToggleInterested}
            />
          )}
          {extraControls}
        </div>
      ) : null}

      <div className="relative min-w-0 flex-1 aspect-[4/3] overflow-hidden rounded-md bg-[#c9b896]/20">
        <ListingPhotoCarousel listing={listing} />
      </div>

      {hasRightControls ? (
        <div className="flex shrink-0 flex-col items-center gap-2">
          {onDismiss && <ListingDismissButton onDismiss={onDismiss} />}
          {onRestore && <ListingRestoreButton onRestore={onRestore} />}
        </div>
      ) : null}
    </div>
  );
}

function ListingDetailsBack({
  listing,
  compact,
  onFlipBack,
}: {
  listing: AppListing;
  compact?: boolean;
  onFlipBack: () => void;
}) {
  const rows = listingDetailRows(listing);
  const description = listingDescriptionText(listing);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden",
        compact ? "gap-2.5 p-3" : "gap-3 p-4"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line pb-2">
        <p
          className={cn(
            "font-mono uppercase tracking-wide text-brass",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          Listing details
        </p>
        <CardFlipButton flipped onToggle={onFlipBack} className="shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length > 0 ? (
          <dl className="space-y-2">
            {rows.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 gap-y-0.5">
                <dt
                  className={cn(
                    "text-ink-soft",
                    compact ? "text-[11px]" : "text-xs"
                  )}
                >
                  {label}
                </dt>
                <dd
                  className={cn(
                    "font-medium text-ink",
                    compact ? "text-[11px]" : "text-xs"
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={cn("text-ink-soft", compact ? "text-xs" : "text-sm")}>
            No additional details available for this listing.
          </p>
        )}

        <div className="mt-3 border-t border-line pt-3">
          <p
            className={cn(
              "font-mono uppercase tracking-wide text-brass",
              compact ? "text-[9px]" : "text-[10px]"
            )}
          >
            Description
          </p>
          <p
            className={cn(
              "mt-1.5 break-words whitespace-pre-wrap text-ink-soft",
              compact ? "text-[11px] leading-relaxed" : "text-xs leading-relaxed"
            )}
          >
            {description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-line pt-2">
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-8 shrink-0 rounded-md bg-ink px-3 text-xs text-card hover:bg-ink/90",
            compact ? "text-xs" : "text-sm"
          )}
          asChild
        >
          <a href={listing.url} target="_blank" rel="noopener noreferrer">
            View listing
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
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
          className="h-full w-full object-contain object-center"
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

function HuntContributionChips({
  contribution,
  listing,
  chips,
  fallbackLabels,
}: {
  contribution: { huntId: string };
  listing: AppListing;
  chips: AttributeMatch[] | null;
  fallbackLabels: string[] | null;
}) {
  if (chips == null && fallbackLabels == null) return null;

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {chips?.map((m) => (
        <AttributeTag
          key={`${contribution.huntId}-${m.key}`}
          match={m}
          listing={listing}
        />
      ))}
      {fallbackLabels?.map((label) => (
        <span
          key={`${contribution.huntId}-${label}`}
          className="inline-flex items-center gap-1 rounded-full bg-brass/12 px-2 py-0.5 text-[10px] font-medium leading-none text-ink"
        >
          <Check className="h-2.5 w-2.5 shrink-0 text-brass" strokeWidth={2.5} />
          {label}
        </span>
      ))}
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

function MatchQualityBadge({
  matchQuality,
  compact,
}: {
  matchQuality: MatchQuality;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card/95 px-2 py-0.5 font-medium text-ink shadow-sm",
        compact ? "text-[10px]" : "text-[11px]"
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", matchQualityDotClass(matchQuality.level))}
      />
      {matchQuality.label}
    </span>
  );
}

function HuntMatchBlock({
  contributions,
  listing,
  matchQuality,
  compact,
}: {
  contributions: HuntScoreContribution[];
  listing: AppListing;
  matchQuality: MatchQuality | null;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-2", compact ? "text-[11px]" : "text-xs")}>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "font-mono uppercase tracking-wide text-brass",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          Hunt Match
        </p>
        {matchQuality != null && (
          <MatchQualityBadge matchQuality={matchQuality} compact={compact} />
        )}
      </div>

      {contributions.map((contribution) => {
        const chips =
          contribution.attributeMatches.length > 0 ? contribution.attributeMatches : null;
        const fallbackLabels =
          chips == null && contribution.matchedOn.length > 0 ? contribution.matchedOn : null;

        return (
          <div key={contribution.huntId} className="flex items-start justify-between gap-2">
            <p className="min-w-0 shrink-0 font-medium leading-snug text-ink">
              {contribution.huntName}
            </p>
            <HuntContributionChips
              contribution={contribution}
              listing={listing}
              chips={chips}
              fallbackLabels={fallbackLabels}
            />
          </div>
        );
      })}
    </div>
  );
}

interface AlertListingCardProps {
  listing: AppListing;
  match?: HuntMatchResult;
  interested?: boolean;
  isNew?: boolean;
  muted?: boolean;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
  onToggleInterested?: () => void;
}

export function AlertListingCard({
  listing,
  match,
  interested = false,
  isNew = false,
  muted = false,
  compact = false,
  selected = false,
  onSelect,
  onDismiss,
  onRestore,
  onToggleInterested,
}: AlertListingCardProps) {
  const [flipped, setFlipped] = useState(false);
  const useDetailPanel = Boolean(onSelect);
  const costs = getTotalCost(listing, DEFAULT_CRITERIA.postalCode);
  const matchQuality = match ? matchQualityFromResult(match) : null;
  const attributeMatches = match?.attributeMatches ?? [];
  const visibleAttributes = attributeMatches.filter(
    (m) => m.status === "hit" || m.status === "miss"
  );
  const huntContributions = match?.huntContributions ?? [];
  const showStandaloneAttributeRow =
    visibleAttributes.length > 0 && huntContributions.length === 0;
  const showMatchSection =
    showStandaloneAttributeRow || huntContributions.length > 0;
  const { swipeHandlers, swipeStyle, touchAction } = useSwipeToDismiss(onDismiss);

  return (
    <article
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      style={{ ...swipeStyle, touchAction }}
      {...swipeHandlers}
      className={cn(
        "relative rounded-lg border border-line bg-card shadow-sm transition-colors",
        muted && "opacity-60",
        !interested && matchQuality && matchQualityCardHighlightClass(matchQuality.level),
        interested && "border-steal/35 bg-steal/[0.04]",
        onSelect && "cursor-pointer transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steal",
        selected && "ring-2 ring-steal/70 ring-offset-2 ring-offset-paper"
      )}
    >
      {isNew && <NewListingTab />}
      <div className="overflow-hidden rounded-lg">
      {useDetailPanel ? (
        <div className="flex flex-col">
          <ListingPhotoArea
            listing={listing}
            interested={interested}
            isNew={isNew}
            onToggleInterested={onToggleInterested}
            onDismiss={onDismiss}
            onRestore={onRestore}
          />

          <div className={cn("flex flex-1 flex-col", compact ? "gap-2.5 p-3" : "gap-3 p-4")}>
            <div className="pb-1">
              <div className="grid grid-cols-[1fr_5.5rem] items-center gap-3">
                <h3
                  className={cn(
                    "min-w-0 font-display font-semibold leading-snug text-ink",
                    compact ? "line-clamp-4 text-sm" : "line-clamp-4 text-base"
                  )}
                >
                  {listing.title}
                </h3>
                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  <span
                    className={cn(
                      "font-display font-semibold tabular-nums text-ink",
                      compact ? "text-lg" : "text-xl"
                    )}
                  >
                    ${costs.total.toFixed(2)}
                  </span>
                  <MarketplaceIcon source={listing.source} />
                </div>
              </div>
            </div>

            {showMatchSection && (
              <div
                className="mt-auto space-y-2 border-t border-line pt-2.5"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {showStandaloneAttributeRow && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {visibleAttributes.map((m) => (
                      <AttributeTag key={m.key} match={m} listing={listing} />
                    ))}
                  </div>
                )}

                {huntContributions.length > 0 && (
                  <HuntMatchBlock
                    contributions={huntContributions}
                    listing={listing}
                    matchQuality={matchQuality}
                    compact={compact}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="[perspective:1000px]">
        <div
          className={cn(
            "relative transition-transform duration-500 ease-in-out [transform-style:preserve-3d] motion-reduce:transition-none",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          <div className="flex flex-col [backface-visibility:hidden]">
            <ListingPhotoArea
              listing={listing}
              interested={interested}
              isNew={isNew}
              onToggleInterested={onToggleInterested}
              onDismiss={onDismiss}
              onRestore={onRestore}
              extraControls={
                <CardFlipButton
                  flipped={false}
                  onToggle={() => setFlipped(true)}
                />
              }
            />

            <div className={cn("flex flex-1 flex-col", compact ? "gap-2.5 p-3" : "gap-3 p-4")}>
              <div className="pb-1">
                <div className="grid grid-cols-[1fr_5.5rem] items-center gap-3">
                  <h3
                    className={cn(
                      "min-w-0 font-display font-semibold leading-snug text-ink",
                      compact ? "line-clamp-4 text-sm" : "line-clamp-4 text-base"
                    )}
                  >
                    {listing.title}
                  </h3>
                  <div className="flex shrink-0 items-center justify-end gap-1.5">
                    <span
                      className={cn(
                        "font-display font-semibold tabular-nums text-ink",
                        compact ? "text-lg" : "text-xl"
                      )}
                    >
                      ${costs.total.toFixed(2)}
                    </span>
                    <MarketplaceIcon source={listing.source} />
                  </div>
                </div>
              </div>

              {showStandaloneAttributeRow && (
                <div className="flex flex-wrap justify-end gap-1">
                  {visibleAttributes.map((m) => (
                    <AttributeTag key={m.key} match={m} listing={listing} />
                  ))}
                </div>
              )}

              {huntContributions.length > 0 && (
                <div className="mt-auto border-t border-line pt-2.5">
                  <HuntMatchBlock
                    contributions={huntContributions}
                    listing={listing}
                    matchQuality={matchQuality}
                    compact={compact}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col overflow-hidden bg-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <ListingDetailsBack
              listing={listing}
              compact={compact}
              onFlipBack={() => setFlipped(false)}
            />
          </div>
        </div>
      </div>
      )}
      </div>
    </article>
  );
}
