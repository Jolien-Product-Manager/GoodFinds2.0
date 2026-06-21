import type { Hunt } from "./types";

/** Collector terms that map to Custom traits — shared by hunt + feed search. */
const DOMAIN_CUSTOM_TERMS: {
  test: (query: string) => boolean;
  value: string;
}[] = [
  {
    test: (q) => /\b(deadstock|dead[\s-]?stock)\b/i.test(q),
    value: "Deadstock",
  },
];

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function resolveNamedDomainCustomTerm(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const { test, value } of DOMAIN_CUSTOM_TERMS) {
    if (test(trimmed)) return value;
  }
  return null;
}

function huntHasAnyTaste(hunt: Hunt): boolean {
  return Object.values(hunt.attributes).some(
    (a) => a.picks.length > 0 || a.customs.length > 0
  );
}

/** Backfill traits when a hunt name implies a domain term but attrs are empty. */
export function withInferredHuntCriteria(hunt: Hunt): Hunt {
  const term = resolveNamedDomainCustomTerm(hunt.name);
  if (!term || huntHasAnyTaste(hunt)) return hunt;

  const traits = hunt.attributes.traits ?? { picks: [], customs: [] };
  const norm = normalizeTerm(term);
  const already = [...traits.picks, ...traits.customs].some(
    (v) => normalizeTerm(v) === norm
  );
  if (already) return hunt;

  return {
    ...hunt,
    attributes: {
      ...hunt.attributes,
      traits: { picks: [...traits.picks, term], customs: traits.customs },
    },
  };
}

export function huntNameImpliesCriteria(hunt: Hunt): boolean {
  return Boolean(resolveNamedDomainCustomTerm(hunt.name));
}
