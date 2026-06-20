import type { ListingGender } from "./types";

const WOMENS_KEYWORDS = [
  "women's",
  "womens",
  "women",
  "ladies",
  "lady's",
  "ladys",
  "female",
  "for her",
];

const MENS_KEYWORDS = [
  "men's",
  "mens",
  "men ",
  " for men",
  "gentleman",
  "male",
  "for him",
];

export function inferListingGender(title: string): ListingGender {
  const lower = title.toLowerCase();

  const isWomens = WOMENS_KEYWORDS.some((kw) => lower.includes(kw));
  const isMens = MENS_KEYWORDS.some((kw) => lower.includes(kw));

  if (isWomens && !isMens) return "womens";
  if (isMens && !isWomens) return "mens";
  if (isWomens && isMens) return "unisex";
  return "unknown";
}

export function listingMatchesHuntGender(
  listingGender: ListingGender,
  huntGender: "mens" | "womens" | "both"
): boolean {
  if (huntGender === "both") return true;
  if (listingGender === "unknown" || listingGender === "unisex") return true;
  return listingGender === huntGender;
}
