import type { Hunt, AttrKey } from "./types";
import { ATTR_OPTIONS } from "./types";

const SUMMARY_ORDER: AttrKey[] = [
  "era",
  "color",
  "dial",
  "model",
  "collab",
  "case",
  "mvmt",
  "cond",
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

export function buildHuntSummary(hunt: Hunt): string {
  const parts: string[] = [];

  if (hunt.gender === "mens") parts.push("Men's");
  else if (hunt.gender === "womens") parts.push("Women's");
  else if (hunt.gender === "unisex") parts.push("Unisex");
  else if (hunt.gender === "childrens") parts.push("Children's");
  else if (hunt.gender === "boys") parts.push("Boys");
  else if (hunt.gender === "girls") parts.push("Girls");
  else if (hunt.gender === "unisex_children") parts.push("Unisex children's");

  for (const key of SUMMARY_ORDER) {
    if (key === "cond") continue;
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

  const condValues = attributeValues(hunt, "cond");
  let sentence =
    parts.length > 0
      ? parts.join(" · ")
      : "Any vintage Timex";

  if (!attributeValues(hunt, "model").length) {
    sentence = sentence === "Any vintage Timex" ? "Any vintage Timex" : `${sentence} Timex`;
  }

  if (condValues.length > 0) {
    sentence += ` in ${condValues.join(" or ")} condition`;
  }

  const hearts = hunt.hearts ?? 2;
  sentence += ` · ${hearts}♥`;

  return sentence;
}

export function huntTightness(hunt: Hunt): {
  label: string;
  level: "wide" | "loose" | "focused" | "specific";
} {
  const count = Object.keys(hunt.attributes).filter(
    (k) => attributeValues(hunt, k as AttrKey).length > 0
  ).length;

  if (count === 0) return { label: "Wide open", level: "wide" };
  if (count === 1) return { label: "Loose", level: "loose" };
  if (count <= 3) return { label: "Focused", level: "focused" };
  return { label: "Very specific", level: "specific" };
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
