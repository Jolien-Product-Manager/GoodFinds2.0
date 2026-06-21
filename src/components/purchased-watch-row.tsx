"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { purchasedWatchFeatureTags } from "@/lib/hunts/purchased-watch-features";
import type { PurchasedWatch } from "@/lib/hunts/types";
import { getListingImageSrc } from "@/lib/listings/image-url";
import { cn } from "@/lib/utils";

interface PurchasedWatchRowProps {
  watch: PurchasedWatch;
  onRemove: () => void;
  onImageChange: (imageUrl: string | null) => void;
}

export function PurchasedWatchRow({
  watch,
  onRemove,
  onImageChange,
}: PurchasedWatchRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const remoteSrc = getListingImageSrc(watch.imageUrl);
  const imageSrc =
    watch.imageUrl?.startsWith("data:") ? watch.imageUrl : remoteSrc;
  const displayTitle = watch.title?.trim();
  const modelLabel = displayTitle ?? "Purchased watch";
  const featureTags = purchasedWatchFeatureTags(watch);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageFailed(false);
        onImageChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <li className="flex gap-3 rounded-sm border border-line-strong bg-card px-3 py-2">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-paper">
        {imageSrc && !imageFailed ? (
          watch.imageUrl?.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={modelLabel}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={modelLabel}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
              onError={() => setImageFailed(true)}
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-ink-soft hover:bg-paper/80"
            aria-label="Add photo"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="text-[9px] leading-none">Photo</span>
          </button>
        )}
        {imageSrc && !imageFailed && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-end justify-center bg-ink/0 pb-0.5 opacity-0 transition hover:bg-ink/40 hover:opacity-100"
            aria-label="Change photo"
          >
            <span className="rounded-sm bg-ink/80 px-1 py-0.5 text-[9px] text-card">
              Change
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {displayTitle ? (
              <p className="font-display text-base font-medium leading-tight text-ink">
                {displayTitle}
              </p>
            ) : null}
            <a
              href={watch.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex min-w-0 items-center gap-1 text-ink-soft underline",
                displayTitle ? "mt-0.5" : "text-ink"
              )}
            >
              <span className="truncate">{watch.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-1.5 text-[11px] text-steal hover:text-steal"
            onClick={onRemove}
          >
            <X className="mr-0.5 h-3 w-3" />
            Remove
          </Button>
        </div>

        {watch.parsing && (
          <span className="text-ink-soft italic">Reading listing…</span>
        )}

        {(featureTags.length > 0 || (imageSrc && !imageFailed)) && (
          <div className="flex flex-wrap items-center gap-1">
            {featureTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-normal"
              >
                {tag}
              </Badge>
            ))}
            {imageSrc && !imageFailed && (
              <button
                type="button"
                className="text-[10px] text-ink-soft underline-offset-2 hover:underline"
                onClick={() => {
                  setImageFailed(false);
                  onImageChange(null);
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
