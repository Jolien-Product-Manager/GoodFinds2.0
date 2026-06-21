import type { Hunt, AttrKey, HuntGender } from "./types";
import {
  HUNT_GENDER_OPTIONS,
  isGenderRequired,
  isRequiredPick,
} from "./types";

const SUMMARY_ORDER: AttrKey[] = [
  "complications",
  "collab",
  "model",
  "era",
  "datecode",
  "dialOrig",
  "plating",
  "crystal",
  "running",
  "complete",
  "dial",
  "color",
  "mvmt",
  "traits",
];

function formatCollab(value: string): string {
  if (value === "Any collab") return "collab edition";
  if (value === "House brand only") return "no collabs";
  return `${value} edition`;
}

function attributeValues(hunt: Hunt, key: AttrKey): string[] {
  const attr = hunt.attributes[key];
  if (!attr) return [];
  return [...attr.picks, ...attr.customs.filter(Boolean)];
}

export function specificityMultiplier(hunt: Hunt): number {
  const { level } = huntTightness(hunt);
  switch (level) {
    case "wide":
      return 0.5;
    case "loose":
      return 1.0;
    case "focused":
      return 1.5;
    case "specific":
      return 2.0;
  }
}

export function buildHuntSummary(
  hunt: Hunt,
  options?: { omitGender?: boolean }
): string {
  const parts: string[] = [];

  if (!options?.omitGender) {
    if (hunt.gender === "mens") parts.push("Men's");
    else if (hunt.gender === "womens") parts.push("Women's");
    else if (hunt.gender === "unisex") parts.push("Unisex");
    else if (hunt.gender === "childrens") parts.push("Children's");
    else if (hunt.gender === "boys") parts.push("Boys");
    else if (hunt.gender === "girls") parts.push("Girls");
    else if (hunt.gender === "unisex_children") parts.push("Unisex children's");
  }

  for (const key of SUMMARY_ORDER) {
    const values = attributeValues(hunt, key);
    if (values.length === 0) continue;

    if (key === "collab") {
      parts.push(values.map(formatCollab).join(" or "));
    } else if (key === "traits") {
      parts.push(values.join(" · "));
    } else {
      parts.push(values.join(" or "));
    }
  }

  let sentence =
    parts.length > 0
      ? parts.join(" · ")
      : "Any vintage Timex";

  if (!attributeValues(hunt, "model").length) {
    sentence = sentence === "Any vintage Timex" ? "Any vintage Timex" : `${sentence} Timex`;
  }

  const hearts = hunt.hearts;
  if (hearts != null) sentence += ` · ${hearts}♥`;

  return sentence;
}

export function huntTightness(hunt: Hunt): {
  label: string;
  level: "wide" | "loose" | "focused" | "specific";
} {
  const count = huntAttributeFilterCount(hunt);

  if (count === 0) return { label: "Wide open", level: "wide" };
  if (count === 1) return { label: "Loose", level: "loose" };
  if (count <= 3) return { label: "Focused", level: "focused" };
  return { label: "Very specific", level: "specific" };
}

function huntAttributeFilterCount(hunt: Hunt): number {
  return Object.keys(hunt.attributes).filter(
    (k) => attributeValues(hunt, k as AttrKey).length > 0
  ).length;
}

const TIGHTNESS_RANK: Record<
  ReturnType<typeof huntTightness>["level"],
  number
> = {
  specific: 4,
  focused: 3,
  loose: 2,
  wide: 1,
};

/** Most specific → most loose, then highest hearts first. */
export function compareSavedHunts(a: Hunt, b: Hunt): number {
  const rankA = TIGHTNESS_RANK[huntTightness(a).level];
  const rankB = TIGHTNESS_RANK[huntTightness(b).level];
  if (rankA !== rankB) return rankB - rankA;

  const countA = huntAttributeFilterCount(a);
  const countB = huntAttributeFilterCount(b);
  if (countA !== countB) return countB - countA;

  return (b.hearts ?? 0) - (a.hearts ?? 0);
}

export function sortSavedHunts(hunts: Hunt[]): Hunt[] {
  return hunts.filter((h) => h.saved).sort(compareSavedHunts);
}

export type HuntListCategory = "specific" | "taste";

/** Gender-only (or fully open) hunts vs hunts with attribute filters. */
export function huntListCategory(hunt: Hunt): HuntListCategory {
  return huntTightness(hunt).level === "wide" ? "taste" : "specific";
}

export function partitionSavedHunts(hunts: Hunt[]): {
  specific: Hunt[];
  taste: Hunt[];
} {
  const saved = hunts.filter((h) => h.saved);
  return {
    specific: saved.filter((h) => huntListCategory(h) === "specific"),
    taste: saved.filter((h) => huntListCategory(h) === "taste"),
  };
}

export type HuntFilterPill =
  | { kind: "gender"; label: string; value: HuntGender; required?: boolean }
  | { kind: "attr"; key: AttrKey; label: string; value: string; required?: boolean };

export function collectHuntFilterPills(hunt: Hunt): HuntFilterPill[] {
  const pills: HuntFilterPill[] = [];
  const gender = hunt.gender ?? "both";

  if (gender !== "both") {
    const genderLabel =
      HUNT_GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? gender;
    pills.push({
      kind: "gender",
      label: genderLabel,
      value: gender,
      required: isGenderRequired(hunt) ? true : undefined,
    });
  }

  for (const key of SUMMARY_ORDER) {
    const attr = hunt.attributes[key];
    const values = attributeValues(hunt, key);
    for (const value of values) {
      pills.push({
        kind: "attr",
        key,
        label: value,
        value,
        required: isRequiredPick(attr, value) ? true : undefined,
      });
    }
  }

  return pills;
}

export function partitionHuntFilterPills(hunt: Hunt): {
  mustHave: HuntFilterPill[];
  interested: HuntFilterPill[];
} {
  const mustHave: HuntFilterPill[] = [];
  const interested: HuntFilterPill[] = [];
  for (const pill of collectHuntFilterPills(hunt)) {
    if (pill.required) mustHave.push(pill);
    else interested.push(pill);
  }
  return { mustHave, interested };
}

function joinPillLabels(pills: HuntFilterPill[]): string {
  return pills.map((p) => p.label).join(", ");
}

/** One-line summary for the hunt builder card header. */
const DEFAULT_HUNT_NAMES = new Set(["", "untitled hunt"]);

/** Short display name from hunt filters — used as default hunt title. */
export function generateHuntTitle(hunt: Hunt): string {
  const { mustHave, interested } = partitionHuntFilterPills(hunt);
  const primary = mustHave.length > 0 ? mustHave : interested;

  if (primary.length === 0) {
    return "";
  }

  const labels = primary.map((p) => p.label);
  if (labels.length <= 3) return labels.join(" · ");
  return `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}`;
}

export function isAutoHuntName(name: string, hunt: Hunt): boolean {
  const trimmed = name.trim();
  if (DEFAULT_HUNT_NAMES.has(trimmed.toLowerCase())) return true;
  return trimmed === generateHuntTitle(hunt);
}

export function buildHuntHuntingForLine(hunt: Hunt): string {
  const { mustHave, interested } = partitionHuntFilterPills(hunt);

  if (mustHave.length === 0 && interested.length === 0) {
    return "";
  }

  const parts: string[] = [];
  if (mustHave.length > 0) {
    parts.push(`Must have ${joinPillLabels(mustHave)}`);
  }
  if (interested.length > 0) {
    parts.push(`also interested in ${joinPillLabels(interested)}`);
  }
  return `${parts.join(" · ")}.`;
}

export function simulateListingParse(url: string): Record<string, string> {
  const lower = url.toLowerCase();
  const features: Record<string, string> = {};
  if (lower.includes("marlin")) features.model = "Marlin";
  if (lower.includes("viscount")) features.model = "Viscount";
  if (lower.includes("electric")) features.mvmt = "Electric";
  if (lower.includes("1960")) features.era = "1960s";
  if (lower.includes("1970")) features.era = "1970s";
  if (Object.keys(features).length === 0) features.model = "Timex";
  return features;
}
