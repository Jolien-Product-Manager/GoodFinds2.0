import type { ListingGender } from "./types";

/** Word-boundary patterns — catches "Lady", "Ladies", "Women's", etc. */
const WOMENS_PATTERNS = [
  /\bladies\b/,
  /\blady'?s?\b/,
  /\bwomen'?s?\b/,
  /\bwomans?\b/,
  /\bfemale\b/,
  /\bfeminine\b/,
  /\bfor her\b/,
  /\bfor women\b/,
  /\bmisses\b/,
  /\bpetite\b/,
  /\bgirls?\b/,
];

const MENS_PATTERNS = [
  /\bmen'?s?\b/,
  /\bmens\b/,
  /\bmale\b/,
  /\bfor him\b/,
  /\bfor men\b/,
  /\bgentlemen\b/,
  /\bgentleman\b/,
];

const CASE_SIZE_MM = /\b(\d{1,2})\s*mm\b/gi;

export function hasWomensSignals(text: string): boolean {
  const lower = text.toLowerCase();
  return WOMENS_PATTERNS.some((re) => re.test(lower));
}

export function hasMensSignals(text: string): boolean {
  const lower = text.toLowerCase();
  return MENS_PATTERNS.some((re) => re.test(lower));
}

/** Largest case diameter mentioned in title (e.g. "22mm", "33 mm"). */
export function maxCaseSizeMm(title: string): number | null {
  const sizes: number[] = [];
  for (const match of title.matchAll(CASE_SIZE_MM)) {
    const n = parseInt(match[1]!, 10);
    if (n >= 10 && n <= 55) sizes.push(n);
  }
  return sizes.length > 0 ? Math.max(...sizes) : null;
}

/** Vintage Timex ≤30mm with no men's label is usually women's. */
export function isLikelyWomensBySize(title: string): boolean {
  const size = maxCaseSizeMm(title);
  return size != null && size <= 30 && !hasMensSignals(title);
}

export function inferListingGender(title: string): ListingGender {
  const womens = hasWomensSignals(title);
  const mens = hasMensSignals(title);

  if (womens && !mens) return "womens";
  if (mens && !womens) return "mens";
  if (womens && mens) return "unisex";
  if (isLikelyWomensBySize(title)) return "womens";
  return "unknown";
}

export function listingMatchesHuntGender(
  listingGender: ListingGender,
  huntGender: "mens" | "womens" | "both",
  title: string
): boolean {
  if (huntGender === "both") return true;

  const womensHint =
    listingGender === "womens" ||
    hasWomensSignals(title) ||
    isLikelyWomensBySize(title);
  const mensHint = listingGender === "mens" || hasMensSignals(title);

  if (huntGender === "mens") {
    if (womensHint && !mensHint) return false;
    return true;
  }

  if (huntGender === "womens") {
    if (mensHint && !womensHint) return false;
    return true;
  }

  return true;
}
