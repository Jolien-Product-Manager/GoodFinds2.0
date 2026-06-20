const APPAREL_KEYWORDS = [
  "sweater",
  "shirt",
  "jersey",
  "jacket",
  "hoodie",
  "t-shirt",
  "tshirt",
  "polo",
  "cap ",
  " hat",
  "beanie",
  "cycling",
  "apparel",
  "clothing",
];

const PARTS_KEYWORDS = [
  "strap only",
  "band only",
  "bracelet only",
  "movement only",
  "dial only",
  "case only",
  "for parts",
  "parts watch",
  "not working",
  "repair project",
];

export function shouldExcludeEbayTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    APPAREL_KEYWORDS.some((kw) => lower.includes(kw)) ||
    PARTS_KEYWORDS.some((kw) => lower.includes(kw))
  );
}
