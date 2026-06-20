import type { AppListing } from "./types";

/** Title keywords → canonical store-find label (matches hunt builder options). */
const STORE_FIND_KEYWORD_MAP: { label: string; keywords: string[] }[] = [
  { label: "Deadstock", keywords: ["deadstock", "dead stock", "dead-stock"] },
  { label: "Tags attached", keywords: ["tags attached", "with tags", "hang tag", "price tag"] },
  {
    label: "With original box",
    keywords: [
      "original box",
      "with box",
      "w/ box",
      "mint in box",
      "mib",
      "new in box",
      "nib",
    ],
  },
  { label: "Open box", keywords: ["open box"] },
];

function titleContainsPhrase(titleLower: string, phrase: string): boolean {
  return titleLower.includes(phrase.toLowerCase());
}

/** Infer store-find / mint-inventory signals from listing title. */
export function inferStoreFindFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();

  for (const { label, keywords } of STORE_FIND_KEYWORD_MAP) {
    for (const keyword of keywords) {
      if (titleContainsPhrase(lower, keyword)) {
        return label;
      }
    }
  }

  return undefined;
}

export function resolveListingStoreFind(listing: AppListing): string | undefined {
  if (listing.features.storeFind) {
    return listing.features.storeFind;
  }
  if (listing.condition === "Deadstock") {
    return "Deadstock";
  }
  return inferStoreFindFromTitle(listing.title);
}

export function storeFindPickMatchesListing(
  wantedRaw: string,
  listing: AppListing
): boolean {
  const wanted = wantedRaw.trim().toLowerCase();
  const resolved = resolveListingStoreFind(listing);

  if (resolved && resolved.toLowerCase() === wanted) {
    return true;
  }

  const entry = STORE_FIND_KEYWORD_MAP.find(
    (e) => e.label.toLowerCase() === wanted
  );
  if (entry) {
    const lower = listing.title.toLowerCase();
    return entry.keywords.some((kw) => titleContainsPhrase(lower, kw));
  }

  if (resolved) {
    const normalized = resolved.toLowerCase();
    return normalized.includes(wanted) || wanted.includes(normalized);
  }

  return titleContainsPhrase(listing.title.toLowerCase(), wantedRaw);
}
