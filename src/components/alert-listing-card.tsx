"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppListing } from "@/lib/listings/types";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";
import { getListingImageSrc } from "@/lib/listings/image-url";
import { getTotalCost } from "@/lib/shipping";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import { cn } from "@/lib/utils";

interface AlertListingCardProps {
  listing: AppListing;
  match?: HuntMatchResult;
  interested?: boolean;
  muted?: boolean;
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

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-sm border border-line-strong bg-card",
        muted && "opacity-60"
      )}
    >
      <div className="relative aspect-[4/3] bg-paper">
        {imageSrc && !imageFailed ? (
          <Image
            src={imageSrc}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 680px) 100vw, 33vw"
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-soft">
            <span className="font-display text-sm text-ink">{listing.model ?? "Timex"}</span>
            <span className="text-xs">Photo unavailable</span>
          </div>
        )}
        <Badge className="absolute left-2 top-2 border-0 bg-ink/80 text-card">
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

      <div className="flex flex-1 flex-col gap-3 p-4">
        {match && match.score > 0 && (
          <div className="font-mono-data text-xs text-steal">
            <span className="uppercase tracking-wider text-ink-soft">match </span>
            {Math.round(match.score * 100)}%
          </div>
        )}

        <h3 className="font-display text-lg font-medium leading-snug text-ink">
          {listing.model ?? listing.title}
        </h3>

        <p className="text-sm text-ink-soft">
          {[listing.features.era, listing.features.mvmt, listing.year]
            .filter(Boolean)
            .join(" · ") || listing.title}
        </p>

        {match?.attributeMatches && match.attributeMatches.length > 0 && (
          <ul className="space-y-1 text-xs text-ink-soft">
            {match.attributeMatches.map((m) => (
              <li key={m.key} className="flex gap-2">
                <span
                  className={cn(
                    m.status === "hit" && "text-ok",
                    m.status === "miss" && "text-steal",
                    m.status === "unverified" && "text-brass"
                  )}
                >
                  {m.status}
                </span>
                <span>{m.label}</span>
                {m.confidence && (
                  <span className="font-mono-data text-[10px]">({m.confidence})</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {!showHuntMatchTags && huntMatchTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {huntMatchTags.map((name) => (
              <Badge key={name} variant="outline" className="border-brass text-brass">
                {name}
              </Badge>
            ))}
          </div>
        )}

        {match?.whyNote && (
          <p className="border-l-2 border-brass pl-3 font-display text-sm italic text-ink-soft">
            {match.whyNote}
          </p>
        )}

        <div className="font-mono-data text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Total to door</span>
            <span className="font-medium text-ink">${costs.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-soft">
            <span>
              ${costs.item.toFixed(2)} item + ${costs.shipping.toFixed(2)} ship
              {!costs.shippingConfirmed && " (est.)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-sm px-2 py-0.5",
              conditionOk ? "bg-ok/15 text-ok" : "bg-brass/15 text-brass"
            )}
          >
            {conditionOk ? "Likely working" : listing.condition}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "border-ink",
              interested && "border-steal bg-steal/10 text-steal"
            )}
            onClick={onToggleInterested}
          >
            <Star className={cn("mr-1 h-3 w-3", interested && "fill-steal")} />
            {interested ? "Starred" : "Star"}
          </Button>
          {onDismiss && (
            <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
              <X className="mr-1 h-3 w-3" />
              Dismiss
            </Button>
          )}
          {onRestore && (
            <Button type="button" variant="outline" size="sm" onClick={onRestore}>
              Restore
            </Button>
          )}
          <Button type="button" size="sm" className="ml-auto bg-ink text-card" asChild>
            <a href={listing.url} target="_blank" rel="noopener noreferrer">
              View on {listing.source}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
