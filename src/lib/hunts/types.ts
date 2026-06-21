import { TIMEX_MODELS } from "@/lib/models/catalog";
import { migrateLegacyHuntAttributes } from "@/lib/hunts/migrate-attributes";

export type AttrKey =
  | "model"
  | "era"
  | "datecode"
  | "dialOrig"
  | "plating"
  | "crystal"
  | "running"
  | "complete"
  | "collab"
  | "dial"
  | "color"
  | "mvmt"
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
  "collab",
  "dial",
  "color",
  "mvmt",
  "traits",
] as const satisfies readonly AttrKey[];

export const ATTR_OPTIONS: Record<
  AttrKey,
  { label: string; options: string[] }
> = {
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

export const ATTR_KEYS = [...BUYER_AXIS_KEYS, ...TASTE_ATTR_KEYS] as AttrKey[];

/** Preset attribute rows in the hunt builder (excludes free-form traits). */
export const PRESET_ATTR_KEYS = ATTR_KEYS.filter((k) => k !== "traits") as Exclude<
  AttrKey,
  "traits"
>[];

/** Hunt-builder categories exposed as feed sidebar filters (excludes free-form traits). */
export const FEED_FILTER_ATTR_KEYS = PRESET_ATTR_KEYS;

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
