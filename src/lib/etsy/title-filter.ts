const NON_WATCH_KEYWORDS = [
  "sweater",
  "shirt",
  "jersey",
  "jacket",
  "hoodie",
  "t-shirt",
  "tshirt",
  "poster",
  "print",
  "sticker",
  "patch",
  "pin badge",
  "advertisement",
  "manual only",
  "box only",
  "strap only",
  "band only",
  "bracelet only",
];

export function shouldExcludeEtsyTitle(title: string): boolean {
  const lower = title.toLowerCase();
  if (!lower.includes("timex")) return true;
  return NON_WATCH_KEYWORDS.some((kw) => lower.includes(kw));
}
