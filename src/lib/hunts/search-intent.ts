import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  HUNT_GENDER_OPTIONS,
  attributeChipOptions,
  inferHuntGenderFromName,
  normalizeCustomValue,
  type AttrKey,
  type Hunt,
  type HuntGender,
} from "./types";
import type { AttributeLibrary } from "@/lib/persistence/types";

export type HuntSearchIntent =
  | { kind: "gender"; value: HuntGender; source: "rules" | "ai" }
  | { kind: "attr"; key: AttrKey; value: string; source: "rules" | "ai" }
  | { kind: "custom"; value: string; source: "rules" | "ai" };

const GENDER_KEYWORD_PATTERNS: { value: HuntGender; re: RegExp }[] = [
  { value: "womens", re: /\b(womens?|womans?|ladies|lady|for her|female)\b/ },
  { value: "mens", re: /\b(mens?|men|for him|male|gentlemen?)\b/ },
  { value: "boys", re: /\bboys?\b/ },
  { value: "girls", re: /\bgirls?\b/ },
  { value: "unisex_children", re: /\bunisex children'?s?\b/ },
  { value: "childrens", re: /\b(children'?s?|kids?|youth|juniors?)\b/ },
  { value: "unisex", re: /\bunisex\b/ },
  {
    value: "both",
    re: /\b(mens? and womens?|men and women|both genders|all genders)\b/,
  },
];

function inferGenderFromQuery(query: string): HuntGender | null {
  const fromName = inferHuntGenderFromName(query);
  if (fromName) return fromName;

  const normalized = normalizeGenderQuery(query);
  for (const { value, re } of GENDER_KEYWORD_PATTERNS) {
    if (re.test(normalized)) return value;
  }
  return null;
}

function normalizeGenderQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\s_-]+/g, " ");
}

function genderFromOptionLabel(query: string): HuntGender | null {
  const q = normalizeCustomValue(query);
  if (!q) return null;

  // Never map partial "women" queries to Men's & Women's (both).
  const specific = HUNT_GENDER_OPTIONS.filter((o) => o.value !== "both");
  for (const opt of specific) {
    const labelNorm = normalizeCustomValue(opt.label);
    if (labelNorm === q || labelNorm.replace(/'/g, "") === q.replace(/'/g, "")) {
      return opt.value;
    }
  }

  if (/\b(both|any gender)\b/.test(q)) return "both";
  return null;
}

/** Rule-based resolver — fast path; ambiguous queries go to AI when configured. */
export function resolveHuntSearchIntentRules(
  query: string,
  hunt: Hunt,
  attributeLibrary: AttributeLibrary,
  attributeHidden: AttributeLibrary
): HuntSearchIntent | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const genderKeyword = inferGenderFromQuery(trimmed);
  if (genderKeyword) {
    return { kind: "gender", value: genderKeyword, source: "rules" };
  }

  const genderLabel = genderFromOptionLabel(trimmed);
  if (genderLabel) {
    return { kind: "gender", value: genderLabel, source: "rules" };
  }

  const q = normalizeCustomValue(trimmed);
  let best: { key: AttrKey; value: string; score: number } | null = null;

  for (const key of ATTR_KEYS) {
    const chips = attributeChipOptions(
      key,
      attributeLibrary[key] ?? [],
      hunt,
      attributeHidden[key] ?? []
    );
    for (const chip of chips) {
      const norm = normalizeCustomValue(chip);
      if (norm === q) {
        return { kind: "attr", key, value: chip, source: "rules" };
      }
      if (norm.includes(q) || q.includes(norm)) {
        const score = norm.length;
        if (!best || score > best.score) best = { key, value: chip, score };
      }
    }
  }

  if (best && best.score >= q.length) {
    return { kind: "attr", key: best.key, value: best.value, source: "rules" };
  }

  return null;
}

export function huntSearchIntentFallback(query: string): HuntSearchIntent {
  return { kind: "custom", value: query.trim(), source: "rules" };
}

/** Client: rules first, then optional AI API, then traits fallback. */
export async function resolveHuntSearchIntent(
  query: string,
  hunt: Hunt,
  attributeLibrary: AttributeLibrary,
  attributeHidden: AttributeLibrary
): Promise<HuntSearchIntent> {
  const rules = resolveHuntSearchIntentRules(
    query,
    hunt,
    attributeLibrary,
    attributeHidden
  );
  if (rules) return rules;

  try {
    const res = await fetch("/api/hunt-search-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim() }),
    });
    if (res.ok) {
      const data = (await res.json()) as HuntSearchIntent;
      if (data?.kind) return { ...data, source: "ai" };
    }
  } catch {
    // Offline or no API key — fall through.
  }

  return huntSearchIntentFallback(query);
}

export function huntSearchIntentSummary(intent: HuntSearchIntent): string {
  if (intent.kind === "gender") {
    const label =
      HUNT_GENDER_OPTIONS.find((o) => o.value === intent.value)?.label ??
      intent.value;
    return `Gender · ${label}`;
  }
  if (intent.kind === "attr") {
    return `${ATTR_OPTIONS[intent.key].label} · ${intent.value}`;
  }
  return `Note · ${intent.value}`;
}
