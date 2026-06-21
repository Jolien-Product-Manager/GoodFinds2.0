import { TIMEX_MODELS } from "@/lib/models/catalog";

export type AttrKey =
  | "model"
  | "collab"
  | "dial"
  | "color"
  | "era"
  | "case"
  | "mvmt"
  | "cond"
  | "traits";

export interface HuntAttribute {
  picks: string[];
  customs: string[];
}

export type HuntGender =
  | "mens"
  | "womens"
  | "both"
  | "unisex"
  | "childrens"
  | "boys"
  | "girls"
  | "unisex_children";

/** How badly the user wants this hunt (1 = mild, 4 = must-have). */
export type HuntHearts = 1 | 2 | 3 | 4;

export interface Hunt {
  id: string;
  name: string;
  saved: boolean;
  gender: HuntGender;
  /** 1–4 hearts: urgency / how badly you're looking for this hunt. */
  hearts: HuntHearts;
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
  /** Marketplace CDN URL or user-uploaded data URL. */
  imageUrl: string | null;
}

export const ATTR_OPTIONS: Record<
  AttrKey,
  { label: string; options: string[] }
> = {
  model: {
    label: "Model / line",
    options: [...TIMEX_MODELS].sort((a, b) => a.localeCompare(b)),
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
      "NOS / unworn",
      "Excellent",
      "Good / worn",
      "Honest patina",
      "Needs battery",
      "For parts / project",
    ],
  },
  traits: {
    label: "Your characteristics",
    options: [],
  },
};

export const ATTR_KEYS = Object.keys(ATTR_OPTIONS) as AttrKey[];

/** Preset attribute rows in the hunt builder (excludes free-form traits). */
export const PRESET_ATTR_KEYS = ATTR_KEYS.filter((k) => k !== "traits") as Exclude<
  AttrKey,
  "traits"
>[];

export const HUNT_GENDER_OPTIONS: { value: HuntGender; label: string }[] = [
  { value: "both", label: "Men's & Women's" },
  { value: "mens", label: "Men's" },
  { value: "womens", label: "Women's" },
  { value: "unisex", label: "Unisex" },
  { value: "childrens", label: "Children's" },
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "unisex_children", label: "Unisex children's" },
];

const VALID_HUNT_GENDERS = new Set<HuntGender>(
  HUNT_GENDER_OPTIONS.map((o) => o.value)
);

/** Preset + saved custom options for a hunt attribute section. */
export function attributeChipOptions(
  key: AttrKey,
  savedCustoms: string[],
  hunt?: Hunt,
  hidden: string[] = []
): string[] {
  const hiddenNorms = new Set(hidden.map(normalizeCustomValue));
  const presets = ATTR_OPTIONS[key].options.filter(
    (p) => !hiddenNorms.has(normalizeCustomValue(p))
  );
  const extras = [
    ...(hunt?.attributes[key]?.picks ?? []),
    ...(hunt?.attributes[key]?.customs ?? []),
    ...savedCustoms,
  ].filter((v) => !hiddenNorms.has(normalizeCustomValue(v)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...presets, ...extras]) {
    const norm = normalizeCustomValue(value);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }
  return out;
}

export function isAttributeValueSelected(
  attr: HuntAttribute | undefined,
  value: string
): boolean {
  if (!attr) return false;
  const norm = normalizeCustomValue(value);
  return [...attr.picks, ...attr.customs].some(
    (v) => normalizeCustomValue(v) === norm
  );
}

export function toggleAttributePick(
  attr: HuntAttribute,
  value: string
): HuntAttribute {
  const norm = normalizeCustomValue(value);
  const selected = [...attr.picks, ...attr.customs].some(
    (v) => normalizeCustomValue(v) === norm
  );
  if (selected) {
    return {
      picks: attr.picks.filter((v) => normalizeCustomValue(v) !== norm),
      customs: attr.customs.filter((v) => normalizeCustomValue(v) !== norm),
    };
  }
  return {
    picks: [...attr.picks, value],
    customs: attr.customs.filter((v) => normalizeCustomValue(v) !== norm),
  };
}

function consolidateAttributeValues(
  key: AttrKey,
  picks: string[],
  customs: string[]
): HuntAttribute {
  const presetByNorm = new Map(
    ATTR_OPTIONS[key].options.map((p) => [normalizeCustomValue(p), p])
  );
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...picks, ...customs]) {
    const norm = normalizeCustomValue(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(presetByNorm.get(norm) ?? raw);
  }
  return { picks: merged, customs: [] };
}

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
    gender: "both",
    hearts: 2,
    attributes: emptyHuntAttributes(),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeHunt(hunt: Partial<Hunt> & Pick<Hunt, "id" | "name">): Hunt {
  const base = emptyHuntAttributes();
  const merged = { ...base, ...(hunt.attributes ?? {}) };
  for (const k of ATTR_KEYS) {
    merged[k] = {
      picks: hunt.attributes?.[k]?.picks ?? [],
      customs: hunt.attributes?.[k]?.customs ?? [],
    };
  }

  // Migrate legacy storeFind picks/customs → traits
  const legacyStoreFind = (hunt.attributes as Record<string, HuntAttribute> | undefined)
    ?.storeFind;
  if (legacyStoreFind) {
    const migrated = [...legacyStoreFind.picks, ...legacyStoreFind.customs]
      .map(normalizeCustomValue)
      .filter(Boolean);
    if (migrated.length > 0) {
      merged.traits = {
        picks: [],
        customs: [...new Set([...merged.traits.customs, ...migrated])],
      };
    }
  }

  // Deadstock in condition → traits (legacy)
  const condPicks = merged.cond.picks;
  if (condPicks.includes("Deadstock")) {
    merged.traits = {
      picks: [],
      customs: [...new Set([...merged.traits.customs, "deadstock"])],
    };
    merged.cond = {
      picks: condPicks.filter((p) => p !== "Deadstock"),
      customs: merged.cond.customs,
    };
  }

  for (const k of ATTR_KEYS) {
    merged[k] = consolidateAttributeValues(
      k,
      merged[k].picks,
      merged[k].customs
    );
  }

  const now = new Date().toISOString();
  return {
    id: hunt.id,
    name: hunt.name,
    saved: hunt.saved ?? false,
    gender:
      hunt.gender && VALID_HUNT_GENDERS.has(hunt.gender) ? hunt.gender : "both",
    hearts: resolveHuntHearts(hunt),
    attributes: merged,
    createdAt: hunt.createdAt ?? now,
    updatedAt: hunt.updatedAt ?? now,
  };
}

export function normalizeCustomValue(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function resolveHuntHearts(
  hunt: Partial<Hunt> & { priority?: number }
): HuntHearts {
  const raw = hunt.hearts ?? hunt.priority;
  return clampHuntHearts(raw);
}

function clampHuntHearts(value: unknown): HuntHearts {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 2;
  return Math.min(4, Math.max(1, Math.round(n))) as HuntHearts;
}
