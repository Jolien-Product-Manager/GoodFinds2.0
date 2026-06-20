export type AttrKey =
  | "model"
  | "collab"
  | "dial"
  | "color"
  | "era"
  | "case"
  | "mvmt"
  | "cond";

export interface HuntAttribute {
  picks: string[];
  customs: string[];
}

export interface Hunt {
  id: string;
  name: string;
  saved: boolean;
  attributes: Record<AttrKey, HuntAttribute>;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalFilters {
  priceCeiling: number | null;
  shipsToMe: boolean;
  postalCode: string | null;
}

export interface PurchasedWatch {
  id: string;
  url: string;
  parsing: boolean;
  features: Record<string, string | number | undefined> | null;
}

export const ATTR_OPTIONS: Record<
  AttrKey,
  { label: string; options: string[] }
> = {
  model: {
    label: "Model / line",
    options: [
      "Marlin",
      "Viscount",
      "Mercury",
      "17/21 jewel",
      "Camper",
      "Electric",
      "Diver",
    ],
  },
  collab: {
    label: "Collaboration",
    options: [
      "Any collab",
      "Peanuts",
      "Disney",
      "Keith Haring",
      "Coca-Cola",
      "Todd Snyder",
      "House brand only",
    ],
  },
  dial: {
    label: "Dial pattern",
    options: ["Crosshair", "Dot-dash", "Plain 2/3-hand", "Numerals", "Day/date"],
  },
  color: {
    label: "Dial color",
    options: ["Silver", "Champagne", "Black", "Blue", "White", "Patina"],
  },
  era: {
    label: "Era",
    options: ["1950s", "Early 60s", "Late 60s", "1970s", "1980s"],
  },
  case: {
    label: "Case size",
    options: ["Under 32mm", "32–35mm", "35–38mm", "Over 38mm"],
  },
  mvmt: {
    label: "Movement",
    options: ["Manual wind", "Self-wind / auto", "Electric"],
  },
  cond: {
    label: "Condition grade",
    options: [
      "Deadstock",
      "NOS / unworn",
      "Excellent",
      "Good / worn",
      "Honest patina",
      "Needs battery",
      "For parts / project",
    ],
  },
};

export const ATTR_KEYS = Object.keys(ATTR_OPTIONS) as AttrKey[];

export function emptyHuntAttributes(): Record<AttrKey, HuntAttribute> {
  const attrs = {} as Record<AttrKey, HuntAttribute>;
  for (const k of ATTR_KEYS) {
    attrs[k] = { picks: [], customs: [] };
  }
  return attrs;
}

export function createDraftHunt(): Hunt {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Untitled hunt",
    saved: false,
    attributes: emptyHuntAttributes(),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCustomValue(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}
