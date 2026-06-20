import { ATTR_OPTIONS } from "@/lib/hunts/types";
import { normalizeCustomValue } from "@/lib/hunts/types";
import type { AppListing } from "./types";

export const COLLAB_META_ANY = "Any collab";
export const COLLAB_META_HOUSE = "House brand only";

/** Named partners from hunt builder (excludes meta-options). */
export const NAMED_COLLAB_PARTNERS = ATTR_OPTIONS.collab.options.filter(
  (o) => o !== COLLAB_META_ANY && o !== COLLAB_META_HOUSE
);

/** Title keywords → canonical partner name. Longer phrases first per partner. */
const COLLAB_KEYWORD_MAP: { partner: string; keywords: string[] }[] = [
  {
    partner: "Keith Haring",
    keywords: ["keith haring", "haring"],
  },
  {
    partner: "Coca-Cola",
    keywords: ["coca-cola", "coca cola", "coke"],
  },
  {
    partner: "Todd Snyder",
    keywords: ["todd snyder"],
  },
  {
    partner: "Peanuts",
    keywords: ["peanuts", "snoopy", "charlie brown", "woodstock"],
  },
  {
    partner: "Disney",
    keywords: ["disney", "mickey mouse", "mickey", "minnie mouse", "minnie"],
  },
];

function titleContainsKeyword(titleLower: string, keyword: string): boolean {
  const normalized = normalizeCustomValue(keyword);
  if (normalized.includes(" ")) {
    return titleLower.includes(normalized);
  }
  const re = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(titleLower);
}

/** Infer co-brand partner from listing title, or undefined if none detected. */
export function inferCollabFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();

  for (const { partner, keywords } of COLLAB_KEYWORD_MAP) {
    for (const keyword of keywords) {
      if (titleContainsKeyword(lower, keyword)) {
        return partner;
      }
    }
  }

  return undefined;
}

/** Resolved collab on a listing: extracted feature or title inference. */
export function resolveListingCollab(listing: AppListing): string | undefined {
  if (listing.features.collab) {
    return listing.features.collab;
  }
  return inferCollabFromTitle(listing.title);
}

/** True when listing is a co-branded / collaboration edition. */
export function listingHasCollab(listing: AppListing): boolean {
  return resolveListingCollab(listing) != null;
}

/** Match a hunt collab pick against a listing (title fallback included). */
export function collabPickMatchesListing(
  wantedRaw: string,
  listing: AppListing
): boolean {
  const wanted = normalizeCustomValue(wantedRaw);
  const inferred = resolveListingCollab(listing);

  if (wanted === normalizeCustomValue(COLLAB_META_ANY)) {
    return listingHasCollab(listing);
  }

  if (wanted === normalizeCustomValue(COLLAB_META_HOUSE)) {
    return !listingHasCollab(listing);
  }

  if (inferred && normalizeCustomValue(inferred) === wanted) {
    return true;
  }

  const partnerEntry = COLLAB_KEYWORD_MAP.find(
    (e) => normalizeCustomValue(e.partner) === wanted
  );
  if (partnerEntry) {
    const lower = listing.title.toLowerCase();
    return partnerEntry.keywords.some((kw) => titleContainsKeyword(lower, kw));
  }

  if (inferred) {
    const normalizedInferred = normalizeCustomValue(inferred);
    return (
      normalizedInferred.includes(wanted) || wanted.includes(normalizedInferred)
    );
  }

  return titleContainsKeyword(listing.title.toLowerCase(), wantedRaw);
}
