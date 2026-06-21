import type { AppListing } from "./types";
import type { AttrKey, HuntAttribute } from "@/lib/hunts/types";
import {
  FEED_CUSTOM_ATTR_KEY,
  FEED_SIDEBAR_ATTR_KEYS,
  normalizeCustomValue,
} from "@/lib/hunts/types";
import { collabPickMatchesListing } from "@/lib/listings/collab";
import { complicationPickMatchesListing } from "@/lib/listings/complications";
import { completenessPickMatchesTitle } from "@/lib/listings/infer-buyer-axes";
import { storeFindPickMatchesListing } from "@/lib/listings/store-find";

function filterValues(attr: HuntAttribute | undefined): string[] {
  if (!attr) return [];
  return [...attr.picks, ...attr.customs].filter((value) => value.trim().length > 0);
}

function listingValueForAttr(listing: AppListing, key: string): string | undefined {
  const f = listing.features;
  switch (key) {
    case "model":
      return f.model?.toLowerCase() ?? listing.model?.toLowerCase();
    case "collab":
      return f.collab?.toLowerCase();
    case "complications":
      return f.complications?.toLowerCase();
    case "dial":
      return f.dial?.toLowerCase();
    case "color":
      return f.color?.toLowerCase();
    case "era":
      return f.era?.toLowerCase();
    case "datecode":
      return f.datecode?.toLowerCase();
    case "dialOrig":
      return f.dialOrig?.toLowerCase();
    case "plating":
      return f.plating?.toLowerCase();
    case "crystal":
      return f.crystal?.toLowerCase();
    case "running":
      return f.running?.toLowerCase();
    case "complete":
      return f.complete?.toLowerCase();
    case "mvmt":
      return f.mvmt?.toLowerCase();
    default:
      return undefined;
  }
}

function listingSearchText(listing: AppListing): string {
  const f = listing.features;
  return normalizeCustomValue(
    [
      listing.title,
      f.model,
      f.collab,
      f.complications,
      f.dial,
      f.color,
      f.era,
      f.datecode,
      f.dialOrig,
      f.plating,
      f.crystal,
      f.running,
      f.complete,
      f.mvmt,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function listingMatchesAttributePick(
  listing: AppListing,
  key: AttrKey,
  wantedRaw: string
): boolean {
  const wanted = normalizeCustomValue(wantedRaw);

  if (key === "collab") {
    return collabPickMatchesListing(wantedRaw, listing);
  }

  if (key === "complications") {
    return complicationPickMatchesListing(
      wantedRaw,
      listing.title,
      listing.description
    );
  }

  if (key === "complete") {
    return completenessPickMatchesTitle(wantedRaw, listing.title);
  }

  if (key === "model") {
    const haystack = listingSearchText(listing);
    return haystack.includes(wanted);
  }

  if (key === FEED_CUSTOM_ATTR_KEY) {
    if (storeFindPickMatchesListing(wantedRaw, listing)) {
      return true;
    }
    const haystack = listingSearchText(listing);
    return haystack.includes(wanted);
  }

  const listingVal = listingValueForAttr(listing, key);
  if (!listingVal) {
    return listingSearchText(listing).includes(wanted);
  }

  const normalizedListing = normalizeCustomValue(listingVal);
  return (
    normalizedListing.includes(wanted) || wanted.includes(normalizedListing)
  );
}

export function hasActiveFeedAttributeFilters(
  filters: Partial<Record<AttrKey, HuntAttribute>> | undefined
): boolean {
  if (!filters) return false;
  return FEED_SIDEBAR_ATTR_KEYS.some((key) => filterValues(filters[key]).length > 0);
}

export function listingPassesFeedAttributeFilters(
  listing: AppListing,
  filters: Partial<Record<AttrKey, HuntAttribute>> | undefined
): boolean {
  if (!filters || !hasActiveFeedAttributeFilters(filters)) return true;

  for (const key of FEED_SIDEBAR_ATTR_KEYS) {
    const wanted = filterValues(filters[key]);
    if (wanted.length === 0) continue;

    const hit = wanted.some((w) => listingMatchesAttributePick(listing, key, w));
    if (!hit) return false;
  }

  return true;
}
