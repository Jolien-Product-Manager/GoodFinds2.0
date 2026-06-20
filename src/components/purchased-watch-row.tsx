"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const modelLabel =
    typeof watch.features?.model === "string" ? watch.features.model : "Timex";

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
    <li className="flex gap-3 rounded-sm border border-line p-3">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-paper">
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
              sizes="80px"
              unoptimized
              onError={() => setImageFailed(true)}
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-soft hover:bg-paper/80"
            aria-label="Add photo"
          >
            <Camera className="h-4 w-4" />
            <span className="text-[10px]">Add photo</span>
          </button>
        )}
        {imageSrc && !imageFailed && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-end justify-center bg-ink/0 pb-1 opacity-0 transition hover:bg-ink/40 hover:opacity-100"
            aria-label="Change photo"
          >
            <span className="rounded-sm bg-ink/80 px-1.5 py-0.5 text-[10px] text-card">
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

      <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        <a
          href={watch.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-ink underline"
        >
          <span className="truncate">{watch.url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>

        {watch.parsing && (
          <span className="text-ink-soft italic">Reading listing…</span>
        )}

        {watch.features && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(watch.features).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {key}: {value}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          {!watch.parsing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className={cn("mr-1 h-3 w-3")} />
              {imageSrc && !imageFailed ? "Change photo" : "Add photo"}
            </Button>
          )}
          {imageSrc && !imageFailed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-ink-soft"
              onClick={() => {
                setImageFailed(false);
                onImageChange(null);
              }}
            >
              Remove photo
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs text-steal"
            onClick={onRemove}
          >
            <X className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
