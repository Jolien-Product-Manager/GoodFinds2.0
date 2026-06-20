"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AppListing } from "@/lib/listings/types";
import type { HuntMatchResult, ScoreBreakdown } from "@/lib/listings/hunt-match";
import { FEED_SCORE_MAX } from "@/lib/listings/hunt-match";
import { getListingImageSrc } from "@/lib/listings/image-url";
import { getTotalCost } from "@/lib/shipping";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { cn } from "@/lib/utils";

function completenessLabel(b: ScoreBreakdown): string {
  if (b.specified === 0) return "gender-only";
  return `${b.hits}/${b.specified} hits`;
}

function MatchScoreDetails({
  score,
  breakdown,
}: {
  score: number;
  breakdown: ScoreBreakdown;
}) {
  const { completeness, specificity, hearts } = breakdown;

  return (
    <div className="space-y-1.5 rounded-sm border border-line bg-paper/60 p-2.5 font-mono-data text-xs">
      <div className="text-ink">
        {completeness.toFixed(completeness === 1 ? 1 : 2)} × {specificity.toFixed(1)} × {hearts}♥
        {" = "}
        {score.toFixed(1)}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-relaxed text-ink-soft">
        <dt>C</dt>
        <dd>
          {completenessLabel(breakdown)} ({completeness.toFixed(completeness === 1 ? 1 : 2)})
        </dd>
        <dt>S</dt>
        <dd>
          {breakdown.specificityLabel} ({specificity.toFixed(1)})
        </dd>
        <dt>H</dt>
        <dd>{hearts}♥ desire</dd>
        <dt>Hunt</dt>
        <dd className="text-ink">{breakdown.bestHuntName}</dd>
      </dl>
    </div>
  );
}

function MatchScoreCollapsible({
  score,
  breakdown,
}: {
  score: number;
  breakdown: ScoreBreakdown;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm border border-line bg-paper/40 px-2.5 py-1.5 font-mono-data text-xs text-steal hover:bg-paper/70 [&[data-state=open]_svg]:rotate-180">
        <span>
          <span className="uppercase tracking-wider text-ink-soft">match </span>
          {score.toFixed(1)}/{FEED_SCORE_MAX}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-soft transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <MatchScoreDetails score={score} breakdown={breakdown} />
      </CollapsibleContent>
    </Collapsible>
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
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getListingImageSrc(listing.imageUrl);
  const costs = getTotalCost(listing, DEFAULT_CRITERIA.postalCode);
  const conditionOk =
    listing.condition !== "For parts / project" &&
    listing.condition !== "Unknown";
  const huntMatchTags = match?.matchedHuntNames ?? [];

  const conditionLabel = conditionOk ? "Likely working" : listing.condition;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-sm border border-line-strong bg-card",
        muted && "opacity-60"
      )}
    >
      <div
        className={cn(
          "relative bg-paper",
          compact ? "aspect-square" : "aspect-[4/3]"
        )}
      >
        {imageSrc && !imageFailed ? (
          <Image
            src={imageSrc}
            alt={listing.title}
            fill
            className="object-cover"
            sizes={compact ? "(max-width: 640px) 50vw, 20vw" : "(max-width: 680px) 100vw, 33vw"}
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-soft">
            <span className="font-display text-sm text-ink">{listing.model ?? "Timex"}</span>
            <span className="text-xs">Photo unavailable</span>
          </div>
        )}
        <Badge
          className={cn(
            "absolute left-1.5 top-1.5 border-0 bg-ink/80 text-card",
            compact && "px-1.5 py-0 text-[10px]"
          )}
        >
          {listing.source}
        </Badge>
        {showHuntMatchTags && huntMatchTags.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {huntMatchTags.map((name) => (
              <Badge
                key={name}
                className="border-0 bg-brass/95 text-card shadow-sm"
              >
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          compact ? "gap-2 p-2.5" : "gap-3 p-4"
        )}
      >
        {match && match.score > 0 && match.scoreBreakdown && (
          <MatchScoreCollapsible score={match.score} breakdown={match.scoreBreakdown} />
        )}
        {match && match.score > 0 && !match.scoreBreakdown && (
          <div className="font-mono-data text-xs text-steal">
            <span className="uppercase tracking-wider text-ink-soft">match </span>
            {match.score.toFixed(1)}/{FEED_SCORE_MAX}
          </div>
        )}

        <h3
          className={cn(
            "font-display font-medium leading-snug text-ink",
            compact ? "line-clamp-2 text-sm" : "text-lg"
          )}
        >
          {listing.model ?? listing.title}
        </h3>

        <p className={cn("text-ink-soft", compact ? "truncate text-xs" : "text-sm")}>
          {[listing.features.era, listing.features.mvmt, listing.year]
            .filter(Boolean)
            .join(" · ") || listing.title}
        </p>

        {!showHuntMatchTags && huntMatchTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {huntMatchTags.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className={cn("border-brass text-brass", compact && "px-1.5 py-0 text-[10px]")}
              >
                {name}
              </Badge>
            ))}
          </div>
        )}

        <div className={cn("font-mono-data", compact ? "text-xs" : "text-sm")}>
          <div className="flex justify-between gap-2">
            <span className="text-ink-soft">{compact ? "To door" : "Total to door"}</span>
            <span className="font-medium text-ink">${costs.total.toFixed(2)}</span>
          </div>
          <p
            className={cn(
              "mt-0.5 text-ink-soft",
              compact ? "text-[10px] leading-tight" : "text-xs"
            )}
          >
            ${costs.item.toFixed(2)} cost · ${costs.shipping.toFixed(2)} shipping
            {!costs.shippingConfirmed && " (est.)"}
          </p>
        </div>

        <div className={cn("flex items-center gap-1.5", compact ? "text-[11px]" : "text-xs")}>
          <span className="text-ink-soft">Condition</span>
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5",
              conditionOk ? "bg-ok/15 text-ok" : "bg-brass/15 text-brass"
            )}
          >
            {conditionLabel}
          </span>
        </div>

        <div className={cn("mt-auto flex flex-wrap gap-1.5", compact ? "pt-1" : "pt-2")}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "border-ink",
              compact && "h-7 px-2 text-xs",
              interested && "border-steal bg-steal/10 text-steal"
            )}
            onClick={onToggleInterested}
          >
            <Star className={cn("mr-1 h-3 w-3", interested && "fill-steal", compact && "mr-0.5")} />
            {interested ? "Starred" : "Star"}
          </Button>
          {onDismiss && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(compact && "h-7 px-2 text-xs")}
              onClick={onDismiss}
            >
              <X className={cn("mr-1 h-3 w-3", compact && "mr-0.5")} />
              Dismiss
            </Button>
          )}
          {onRestore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(compact && "h-7 px-2 text-xs")}
              onClick={onRestore}
            >
              Restore
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className={cn("ml-auto bg-ink text-card", compact && "h-7 px-2 text-xs")}
            asChild
          >
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              View
              <ExternalLink className={cn("ml-1 h-3 w-3", compact && "ml-0.5 h-2.5 w-2.5")} />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
