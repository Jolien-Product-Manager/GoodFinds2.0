export const TIMEX_MODELS = [
  "Marlin",
  "Viscount",
  "Mercury",
  "Sprite",
  "Electric",
  "Camper",
  "Diver",
  "17/21 jewel",
  "Automatic",
] as const;

export type TimexModel = (typeof TIMEX_MODELS)[number];

export function matchListingToModel(title: string): string | null {
  const lower = title.toLowerCase();
  for (const model of TIMEX_MODELS) {
    if (lower.includes(model.toLowerCase())) {
      return model;
    }
  }
  if (lower.includes("automatic")) return "Automatic";
  if (lower.includes("mechanical")) return "17/21 jewel";
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
