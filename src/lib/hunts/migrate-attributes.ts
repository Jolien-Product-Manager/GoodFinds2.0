import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  emptyHuntAttributes,
  normalizeCustomValue,
  type AttrKey,
  type HuntAttribute,
} from "./types";

const LEGACY_KEYS = ["case", "cond"] as const;

let traitToComplicationCache: Map<string, string> | null = null;

function getTraitToComplicationMap(): Map<string, string> {
  if (traitToComplicationCache) return traitToComplicationCache;
  traitToComplicationCache = new Map(
    ATTR_OPTIONS.complications.options.flatMap((option) => {
      const norm = normalizeCustomValue(option);
      const base = normalizeCustomValue(option.replace(/\s*\([^)]*\)\s*$/, ""));
      const entries: [string, string][] = [[norm, option]];
      if (base && base !== norm) entries.push([base, option]);
      return entries;
    })
  );
  return traitToComplicationCache;
}

function appendValues(
  target: HuntAttribute,
  values: string[]
): HuntAttribute {
  const seen = new Set(
    [...target.picks, ...target.customs].map((v) => normalizeCustomValue(v))
  );
  const picks = [...target.picks];
  for (const value of values) {
    const norm = normalizeCustomValue(value);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    picks.push(value);
  }
  return { picks, customs: target.customs };
}

/** Map legacy case/cond sections onto buyer-axis taxonomy. */
export function migrateLegacyHuntAttributes(
  raw: Record<string, HuntAttribute | undefined> | undefined
): Record<AttrKey, HuntAttribute> {
  const merged = emptyHuntAttributes();

  for (const key of ATTR_KEYS) {
    const attr = raw?.[key];
    if (attr) {
      merged[key] = {
        picks: [...attr.picks],
        customs: [...attr.customs],
        ...(attr.required ? { required: true } : {}),
        ...(attr.requiredPicks?.length
          ? { requiredPicks: [...attr.requiredPicks] }
          : {}),
      };
    }
  }

  const legacyCase = raw?.case;
  if (legacyCase) {
    merged.traits = appendValues(merged.traits, [
      ...legacyCase.picks.map((p) => `Case size: ${p}`),
      ...legacyCase.customs.map((p) => `Case size: ${p}`),
    ]);
  }

  const legacyCond = raw?.cond;
  if (legacyCond) {
    for (const value of [...legacyCond.picks, ...legacyCond.customs]) {
      const norm = normalizeCustomValue(value);
      if (
        norm.includes("nos") ||
        norm.includes("unworn") ||
        norm.includes("deadstock")
      ) {
        merged.complete = appendValues(merged.complete, ["NOS / unworn"]);
      } else if (norm.includes("for parts")) {
        merged.running = appendValues(merged.running, ["For parts / movement"]);
      } else if (norm.includes("needs battery")) {
        merged.running = appendValues(merged.running, ["Untested"]);
      } else {
        merged.traits = appendValues(merged.traits, [`Condition: ${value}`]);
      }
    }
  }

  migrateTraitComplications(merged);

  return merged;
}

export function migrateAttributeLibrary(
  library: Partial<Record<string, string[]>> | undefined
): Partial<Record<AttrKey, string[]>> {
  if (!library) return {};
  const next: Partial<Record<AttrKey, string[]>> = {};

  for (const key of ATTR_KEYS) {
    if (library[key]?.length) next[key] = [...library[key]!];
  }

  if (library.case?.length) {
    next.traits = [
      ...(next.traits ?? []),
      ...library.case.map((v) => `Case size: ${v}`),
    ];
  }

  if (library.cond?.length) {
    next.traits = [
      ...(next.traits ?? []),
      ...library.cond.map((v) => `Condition: ${v}`),
    ];
  }

  for (const legacy of LEGACY_KEYS) {
    delete (next as Record<string, string[]>)[legacy];
  }

  return next;
}

function migrateTraitComplications(merged: Record<AttrKey, HuntAttribute>): void {
  const traits = merged.traits;
  if (!traits) return;

  const remainingPicks: string[] = [];
  const remainingCustoms: string[] = [];

  for (const value of [...traits.picks, ...traits.customs]) {
    const mapped = getTraitToComplicationMap().get(normalizeCustomValue(value));
    if (mapped) {
      merged.complications = appendValues(merged.complications, [mapped]);
    } else if (traits.picks.includes(value)) {
      remainingPicks.push(value);
    } else {
      remainingCustoms.push(value);
    }
  }

  merged.traits = { picks: remainingPicks, customs: remainingCustoms };
}
