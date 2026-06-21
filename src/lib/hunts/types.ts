import { TIMEX_MODELS } from "@/lib/models/catalog";
import { migrateLegacyHuntAttributes } from "@/lib/hunts/migrate-attributes";
import type { ConditionGrade } from "@/lib/listings/types";

export type AttrKey =
  | "complications"
  | "collab"
  | "model"
  | "era"
  | "datecode"
  | "dialOrig"
  | "plating"
  | "crystal"
  | "running"
  | "complete"
  | "dial"
  | "color"
  | "mvmt"
  | "traits";

export interface HuntAttribute {
  picks: string[];
  customs: string[];
  /** When true, the listing must match this category or the hunt scores 0. */
  required?: boolean;
  /** Individual picks that must match; toggled via double-click on tiles. */
  requiredPicks?: string[];
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
  /** Archived hunts stay saved but are hidden from the feed and active hunt list. */
  archived?: boolean;
  gender: HuntGender;
  /** When gender is set: true = must-have gate; false = soft preference. Legacy hunts default to must-have. */
  genderRequired?: boolean;
  /** 1–4 hearts: urgency / how badly you're looking for this hunt. Null until user chooses. */
  hearts: HuntHearts | null;
  attributes: Record<AttrKey, HuntAttribute>;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalFilters {
  priceCeiling: number | null;
  shipsToMe: boolean;
  postalCode: string | null;
  allowedConditions: ConditionGrade[];
}

export interface PurchasedWatch {
  id: string;
  url: string;
  parsing: boolean;
  features: Record<string, string | number | undefined> | null;
  /** Marketplace CDN URL or user-uploaded data URL. */
  imageUrl: string | null;
  title: string | null;
  description: string | null;
}

/** Shown near the top of the hunt builder (after gender). */
export const PRIORITY_ATTR_KEYS = [
  "complications",
  "collab",
] as const satisfies readonly AttrKey[];

export const BUYER_AXIS_KEYS = [
  "model",
  "era",
  "datecode",
  "dialOrig",
  "plating",
  "crystal",
  "running",
  "complete",
] as const satisfies readonly AttrKey[];

export const TASTE_ATTR_KEYS = [
  "dial",
  "color",
  "mvmt",
] as const satisfies readonly AttrKey[];

export const ATTR_OPTIONS: Record<
  AttrKey,
  { label: string; options: string[] }
> = {
  complications: {
    label: "Complications",
    options: [
      "Date",
      "Day-date (day + date)",
      "Day of week",
      "Sweep seconds",
      "Sub-seconds",
      "24-hour indicator",
      "Calendar (full)",
      "Chronograph (stopwatch)",
      "Tachymeter scale",
      "Rotating dive bezel",
      "GMT / dual time",
      "Alarm",
      "Moon phase",
      "Power reserve indicator",
      "Indiglo night-light",
      "World time",
      "Pointer date",
    ],
  },
  collab: {
    label: "Collaboration",
    options: [
      "Any collab",
      "Peanuts",
      "Mickey Mouse",
      "Minnie Mouse",
      "Donald Duck",
      "Disney",
      "Keith Haring",
      "Coca-Cola",
      "Pac-Man",
      "NASA",
      "Todd Snyder",
      "House brand only",
    ],
  },
  model: {
    label: "Model / family",
    options: [...TIMEX_MODELS].sort((a, b) => a.localeCompare(b)),
  },
  era: {
    label: "Era",
    options: ["1950s", "Early 60s", "Late 60s", "1970s", "1980s", "1990s"],
  },
  datecode: {
    label: "Date code",
    options: [
      "M69",
      "M70",
      "M71",
      "M72",
      "M73",
      "M74",
      "M75",
      "M76",
      "M77",
      "M78",
      "M79",
      "M80",
      "Pre-code",
      "N/A / unreadable",
    ],
  },
  dialOrig: {
    label: "Dial originality",
    options: [
      "Original dial",
      "Likely original",
      "Redial",
      "Repaint / refinish",
      "Unknown",
    ],
  },
  plating: {
    label: "Case plating",
    options: [
      "Intact plating",
      "Light wear",
      "Brass showing",
      "Heavy brassing",
      "Re-plated",
      "Stainless / no plate",
      "Unknown",
    ],
  },
  crystal: {
    label: "Crystal",
    options: [
      "Original acrylic",
      "Replacement acrylic",
      "Glass / mineral",
      "Scratches only",
      "Cracked / damaged",
      "Unknown",
    ],
  },
  running: {
    label: "Running status",
    options: [
      "Running",
      "Running weak",
      "Not running",
      "Untested",
      "For parts / movement",
    ],
  },
  complete: {
    label: "Completeness",
    options: [
      "Full set (box + papers)",
      "Box only",
      "Papers only",
      "NOS / unworn",
      "Watch only",
      "Tags attached",
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
  mvmt: {
    label: "Movement type",
    options: ["Manual wind", "Self-wind / auto", "Electric", "Quartz"],
  },
  traits: {
    label: "Your characteristics",
    options: [],
  },
};

export const ATTR_KEYS = [
  ...PRIORITY_ATTR_KEYS,
  ...BUYER_AXIS_KEYS,
  ...TASTE_ATTR_KEYS,
] as AttrKey[];

/** Preset attribute rows in the hunt builder (excludes free-form traits). */
export const PRESET_ATTR_KEYS = ATTR_KEYS.filter((k) => k !== "traits") as Exclude<
  AttrKey,
  "traits"
>[];

/** Hunt-builder categories exposed as feed sidebar filters (excludes free-form traits). */
export const FEED_FILTER_ATTR_KEYS = PRESET_ATTR_KEYS;

/** Free-form feed filters (title / keyword search). */
export const FEED_CUSTOM_ATTR_KEY: AttrKey = "traits";

/** All feed sidebar filter sections, including Custom. */
export const FEED_SIDEBAR_ATTR_KEYS = [
  ...PRESET_ATTR_KEYS,
  FEED_CUSTOM_ATTR_KEY,
] as const;

export function feedSidebarAttrLabel(key: AttrKey): string {
  if (key === FEED_CUSTOM_ATTR_KEY) return "Custom";
  return ATTR_OPTIONS[key].label;
}

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

/** Infer gender from hunt name when unambiguous (fixes mis-saved gender chips). */
export function inferHuntGenderFromName(name: string): HuntGender | null {
  const n = normalizeCustomValue(name);
  const hasWomens = /\b(womens|women|womans|ladies|lady)\b/.test(n);
  const hasMens = /\b(mens|men|gentlemen|gentleman)\b/.test(n);
  if (hasWomens && !hasMens) return "womens";
  if (hasMens && !hasWomens) return "mens";
  return null;
}

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

export function isRequiredPick(
  attr: HuntAttribute | undefined,
  value: string
): boolean {
  if (!attr) return false;
  const norm = normalizeCustomValue(value);
  if (attr.requiredPicks?.some((v) => normalizeCustomValue(v) === norm)) {
    return true;
  }
  return attr.required === true && isAttributeValueSelected(attr, value);
}

function addRequiredPick(attr: HuntAttribute, value: string): HuntAttribute {
  const norm = normalizeCustomValue(value);
  const existing = attr.requiredPicks ?? [];
  if (existing.some((v) => normalizeCustomValue(v) === norm)) return attr;
  return {
    ...attr,
    requiredPicks: [...existing, value],
    required: undefined,
  };
}

function removeRequiredPick(attr: HuntAttribute, value: string): HuntAttribute {
  const norm = normalizeCustomValue(value);
  const next = attr.requiredPicks?.filter((v) => normalizeCustomValue(v) !== norm);
  return {
    ...attr,
    requiredPicks: next?.length ? next : undefined,
  };
}

/** Mark a pick as must-have without toggling require off. */
export function markPickRequired(
  attr: HuntAttribute,
  value: string
): HuntAttribute {
  const withPick = isAttributeValueSelected(attr, value)
    ? attr
    : toggleAttributePick(attr, value);
  return addRequiredPick(withPick, value);
}

/** Double-click tiles: select + require, or toggle require on/off. */
export function toggleAttributeRequiredPick(
  attr: HuntAttribute,
  value: string
): HuntAttribute {
  const selected = isAttributeValueSelected(attr, value);
  const required = isRequiredPick(attr, value);

  if (!selected) {
    return addRequiredPick(toggleAttributePick(attr, value), value);
  }
  if (required) {
    return removeRequiredPick(attr, value);
  }
  return addRequiredPick(attr, value);
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
    const next = {
      picks: attr.picks.filter((v) => normalizeCustomValue(v) !== norm),
      customs: attr.customs.filter((v) => normalizeCustomValue(v) !== norm),
    };
    const nextRequiredPicks = attr.requiredPicks?.filter(
      (v) => normalizeCustomValue(v) !== norm
    );
    if (next.picks.length === 0 && next.customs.length === 0) {
      return { picks: [], customs: [] };
    }
    return {
      ...next,
      required: attr.required,
      requiredPicks: nextRequiredPicks?.length ? nextRequiredPicks : undefined,
    };
  }
  return {
    picks: [...attr.picks, value],
    customs: attr.customs.filter((v) => normalizeCustomValue(v) !== norm),
    required: attr.required,
    requiredPicks: attr.requiredPicks,
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

function consolidateRequiredPicks(
  key: AttrKey,
  requiredPicks: string[],
  picks: string[]
): string[] {
  const pickNorms = new Set(picks.map((p) => normalizeCustomValue(p)));
  const presetByNorm = new Map(
    ATTR_OPTIONS[key].options.map((p) => [normalizeCustomValue(p), p])
  );
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of requiredPicks) {
    const norm = normalizeCustomValue(raw);
    if (!norm || !pickNorms.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(presetByNorm.get(norm) ?? raw);
  }
  return merged;
}

export function emptyHuntAttributes(): Record<AttrKey, HuntAttribute> {
  const attrs = {} as Record<AttrKey, HuntAttribute>;
  for (const k of ATTR_KEYS) {
    attrs[k] = { picks: [], customs: [] };
  }
  return attrs;
}

/** Gender is a must-have gate (legacy hunts with gender set default to true). */
export function isGenderRequired(hunt: Hunt): boolean {
  const gender = hunt.gender ?? "both";
  if (gender === "both") return false;
  if (hunt.genderRequired === false) return false;
  if (hunt.genderRequired === true) return true;
  return true;
}

export function createDraftHunt(): Hunt {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    saved: false,
    gender: "both",
    hearts: null,
    attributes: emptyHuntAttributes(),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeHunt(hunt: Partial<Hunt> & Pick<Hunt, "id" | "name">): Hunt {
  let merged = migrateLegacyHuntAttributes(
    hunt.attributes as Record<string, HuntAttribute> | undefined
  );

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

  for (const k of ATTR_KEYS) {
    const prev = merged[k];
    merged[k] = consolidateAttributeValues(k, prev.picks, prev.customs);
    if (prev.required) merged[k].required = true;
    if (prev.requiredPicks?.length) {
      merged[k].requiredPicks = consolidateRequiredPicks(
        k,
        prev.requiredPicks,
        merged[k].picks
      );
    }
  }

  const now = new Date().toISOString();
  const genderFromName = inferHuntGenderFromName(hunt.name);
  const gender =
    genderFromName ??
    (hunt.gender && VALID_HUNT_GENDERS.has(hunt.gender) ? hunt.gender : "both");
  return {
    id: hunt.id,
    name: hunt.name,
    saved: hunt.saved ?? false,
    archived: hunt.archived ?? false,
    gender,
    genderRequired:
      gender === "both" ? undefined : hunt.genderRequired,
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
): HuntHearts | null {
  const raw = hunt.hearts ?? hunt.priority;
  return clampHuntHearts(raw);
}

function clampHuntHearts(value: unknown): HuntHearts | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(4, Math.max(1, Math.round(n))) as HuntHearts;
}

export function isHuntHearts(value: unknown): value is HuntHearts {
  return clampHuntHearts(value) != null;
}
