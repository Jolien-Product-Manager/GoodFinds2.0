/** Vintage Timex model / line names for hunt chips and title matching. Longer names first in matcher. */
export const TIMEX_MODELS = [
  "Skin Diver",
  "17/21 jewel",
  "Dyna-Sonic",
  "Q Timex",
  "Easy Reader",
  "Waterbury",
  "Marlin",
  "Viscount",
  "Mercury",
  "Sprite",
  "Electric",
  "Camper",
  "Diver",
  "Automatic",
  "Carriage",
  "Tuxedo",
  "Atlantis",
  "President",
  "Cavatina",
  "Sinclair",
  "Friars",
  "Indiglo",
  "Military",
  "Weekender",
  "Ironman",
] as const;

export type TimexModel = (typeof TIMEX_MODELS)[number];

const MODEL_MATCH_ORDER = [...TIMEX_MODELS].sort(
  (a, b) => b.length - a.length
);

export function matchListingToModel(title: string): string | null {
  const lower = title.toLowerCase();
  for (const model of MODEL_MATCH_ORDER) {
    if (lower.includes(model.toLowerCase())) {
      return model;
    }
  }
  if (lower.includes("automatic")) return "Automatic";
  if (lower.includes("mechanical") || lower.includes("jewel")) return "17/21 jewel";
  return null;
}

export function eraFromYear(year: number | null): string | undefined {
  if (!year) return undefined;
  if (year < 1960) return "1950s";
  if (year <= 1964) return "Early 60s";
  if (year <= 1969) return "Late 60s";
  if (year <= 1979) return "1970s";
  return "1980s";
}
