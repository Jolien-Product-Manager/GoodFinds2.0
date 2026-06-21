import type { AttributeLibrary, PersistedState } from "@/lib/persistence/types";
import {
  ATTR_KEYS,
  ATTR_OPTIONS,
  normalizeCustomValue,
} from "@/lib/hunts/types";

export function isPersistedStateEmpty(state: PersistedState): boolean {
  return (
    state.seen.length === 0 &&
    state.hunts.length === 0 &&
    state.purchasedWatches.length === 0 &&
    Object.keys(state.listingStatus).length === 0
  );
}

export function mergeAttributeLibraries(
  local: AttributeLibrary | undefined,
  remote: AttributeLibrary | undefined
): AttributeLibrary {
  const out: AttributeLibrary = { ...(local ?? {}) };
  for (const key of ATTR_KEYS) {
    const existing = out[key] ?? [];
    const seen = new Set(existing.map((v) => normalizeCustomValue(v)));
    const presetNorms = new Set(
      ATTR_OPTIONS[key].options.map((o) => normalizeCustomValue(o))
    );
    const added = (remote?.[key] ?? []).filter((v) => {
      const norm = normalizeCustomValue(v);
      if (!norm || seen.has(norm) || presetNorms.has(norm)) return false;
      seen.add(norm);
      return true;
    });
    if (added.length > 0) {
      out[key] = [...existing, ...added];
    }
  }
  return out;
}

/** Merge hidden tile lists — includes preset options the user removed from suggestions. */
export function mergeAttributeHidden(
  local: AttributeLibrary | undefined,
  remote: AttributeLibrary | undefined
): AttributeLibrary {
  const out: AttributeLibrary = { ...(local ?? {}) };
  for (const key of ATTR_KEYS) {
    const existing = out[key] ?? [];
    const seen = new Set(existing.map((v) => normalizeCustomValue(v)));
    const added = (remote?.[key] ?? []).filter((v) => {
      const norm = normalizeCustomValue(v);
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
    if (added.length > 0) {
      out[key] = [...existing, ...added];
    }
  }
  return out;
}
