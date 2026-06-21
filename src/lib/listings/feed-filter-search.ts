import {
  ATTR_OPTIONS,
  FEED_CUSTOM_ATTR_KEY,
  FEED_FILTER_ATTR_KEYS,
  FEED_SIDEBAR_ATTR_KEYS,
  normalizeCustomValue,
  type AttrKey,
  type HuntAttribute,
} from "@/lib/hunts/types";
import { resolveNamedDomainCustomTerm } from "@/lib/hunts/domain-terms";
import type { AttributeLibrary } from "@/lib/persistence/types";

export type FeedFilterMatchSource = "rules" | "ai";

export interface FeedFilterMatch {
  key: AttrKey;
  value: string;
  source: FeedFilterMatchSource;
}

/** Collector terms that map to Custom — not completeness or other presets. */
const FEED_DOMAIN_CUSTOM_TERMS: {
  test: (query: string) => boolean;
  value: string;
}[] = [
  {
    test: (q) => resolveNamedDomainCustomTerm(q) === "Deadstock",
    value: "Deadstock",
  },
];

export function resolveFeedDomainCustomMatch(query: string): FeedFilterMatch | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  for (const { test, value } of FEED_DOMAIN_CUSTOM_TERMS) {
    if (test(trimmed)) {
      return { key: FEED_CUSTOM_ATTR_KEY, value, source: "rules" };
    }
  }
  return null;
}

/** Common collector phrases → preset filter options (fast path before AI). */
const FEED_PRESET_SYNONYMS: {
  test: RegExp;
  key: AttrKey;
  value: string;
}[] = [
  {
    test: /\b(gmt|dual[\s-]?time(?:zone)?|dual[\s-]?hour|time[\s-]?zone|second time zone|2nd time zone)\b/i,
    key: "complications",
    value: "GMT / dual time",
  },
  {
    test: /\b(chrono(graph)?|stopwatch)\b/i,
    key: "complications",
    value: "Chronograph (stopwatch)",
  },
  {
    test: /\b(moonphase|moon[\s-]?phase|sun[\s-]?moon)\b/i,
    key: "complications",
    value: "Moon phase",
  },
  {
    test: /\b(indiglo|night[\s-]?light)\b/i,
    key: "complications",
    value: "Indiglo night-light",
  },
  {
    test: /\b(snoopy|peanuts|charlie brown|woodstock)\b/i,
    key: "collab",
    value: "Peanuts",
  },
  {
    test: /\b(mickey|minnie|donald duck|disney)\b/i,
    key: "collab",
    value: "Mickey Mouse",
  },
  {
    test: /\b(70s|1970s|seventies)\b/i,
    key: "era",
    value: "1970s",
  },
  {
    test: /\b(80s|1980s|eighties)\b/i,
    key: "era",
    value: "1980s",
  },
  {
    test: /\b(marlin)\b/i,
    key: "model",
    value: "Marlin",
  },
];

export function resolveFeedPresetSynonymMatches(query: string): FeedFilterMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const out: FeedFilterMatch[] = [];
  const seen = new Set<string>();
  for (const { test, key, value } of FEED_PRESET_SYNONYMS) {
    if (!test.test(trimmed)) continue;
    const id = `${key}:${normalizeCustomValue(value)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ key, value, source: "rules" });
  }
  return out;
}

/** Collapse spaces/punctuation so "moonphase" matches "Moon phase". */
export function compactSearchTerm(value: string): string {
  return normalizeCustomValue(value).replace(/[\s_./-]+/g, "");
}

export function isPresetFeedOption(key: AttrKey, value: string): boolean {
  if (key === FEED_CUSTOM_ATTR_KEY) return false;
  const norm = normalizeCustomValue(value);
  return ATTR_OPTIONS[key].options.some(
    (option) => normalizeCustomValue(option) === norm
  );
}

export function feedFilterOptionsForKey(
  key: AttrKey,
  attributeLibrary: AttributeLibrary,
  activeFilters?: Partial<Record<AttrKey, HuntAttribute>>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const sources =
    key === FEED_CUSTOM_ATTR_KEY
      ? [
          ...(activeFilters?.traits?.picks ?? []),
          ...(activeFilters?.traits?.customs ?? []),
          ...(attributeLibrary.traits ?? []),
        ]
      : key === "model"
        ? [...ATTR_OPTIONS.model.options]
        : [
            ...ATTR_OPTIONS[key].options,
            ...(attributeLibrary[key] ?? []),
          ];

  for (const raw of sources) {
    const norm = normalizeCustomValue(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(raw);
  }
  return out;
}

export function buildFeedFilterCatalog(
  attributeLibrary: AttributeLibrary,
  activeFilters?: Partial<Record<AttrKey, HuntAttribute>>
): FeedFilterMatch[] {
  const catalog: FeedFilterMatch[] = [];
  for (const key of FEED_SIDEBAR_ATTR_KEYS) {
    for (const value of feedFilterOptionsForKey(
      key,
      attributeLibrary,
      activeFilters
    )) {
      catalog.push({ key, value, source: "rules" });
    }
  }
  return catalog;
}

function optionMatchesQuery(query: string, option: string, categoryLabel: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const labels = [option, categoryLabel];
  if (labels.some((label) => label.toLowerCase().includes(q))) return true;

  const qCompact = compactSearchTerm(q);
  if (!qCompact) return true;

  return labels.some((label) => {
    const compact = compactSearchTerm(label);
    if (compact === qCompact) return true;
    // Query is a prefix of the option — not the other way around.
    return compact.includes(qCompact);
  });
}

export function matchFeedFilterOptionsLocal(
  query: string,
  catalog: FeedFilterMatch[]
): FeedFilterMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return catalog;

  const synonyms = resolveFeedPresetSynonymMatches(trimmed);
  const fromCatalog = catalog.filter((entry) =>
    optionMatchesQuery(trimmed, entry.value, ATTR_OPTIONS[entry.key].label)
  );
  return dedupeFeedFilterMatches([...synonyms, ...fromCatalog]);
}

export function dedupeFeedFilterMatches(
  matches: FeedFilterMatch[]
): FeedFilterMatch[] {
  const seen = new Set<string>();
  const out: FeedFilterMatch[] = [];
  for (const match of matches) {
    const id = `${match.key}:${normalizeCustomValue(match.value)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(match);
  }
  return out;
}

function isPresetOption(key: AttrKey, value: string): boolean {
  return isPresetFeedOption(key, value);
}

/** Keep preset matches and custom traits; drop library-only model chips. */
export function filterFeedFilterMatches(matches: FeedFilterMatch[]): FeedFilterMatch[] {
  return dedupeFeedFilterMatches(
    matches.filter(
      (match) =>
        match.key === FEED_CUSTOM_ATTR_KEY || isPresetFeedOption(match.key, match.value)
    )
  );
}

/** Drop custom chips that only mirror the query when a preset already matched. */
export function rankFeedFilterMatches(
  matches: FeedFilterMatch[],
  query: string
): FeedFilterMatch[] {
  const deduped = dedupeFeedFilterMatches(matches);
  const qCompact = compactSearchTerm(query);
  if (!qCompact) return deduped;

  const hasPresetSemantic = deduped.some(
    (match) =>
      isPresetOption(match.key, match.value) &&
      (compactSearchTerm(match.value) === qCompact ||
        compactSearchTerm(match.value).includes(qCompact) ||
        qCompact.includes(compactSearchTerm(match.value)))
  );

  if (!hasPresetSemantic) return deduped;

  return deduped.filter((match) => {
    if (isPresetOption(match.key, match.value)) return true;
    return compactSearchTerm(match.value) !== qCompact;
  });
}

/** Finalize search results — fall back to a Custom filter when nothing preset matches. */
export function finalizeFeedFilterMatches(
  matches: FeedFilterMatch[],
  query: string
): FeedFilterMatch[] {
  const trimmed = query.trim();
  const domain = resolveFeedDomainCustomMatch(trimmed);
  if (domain) return [domain];

  const ranked = rankFeedFilterMatches(filterFeedFilterMatches(matches), trimmed);
  if (!trimmed) return ranked;

  const qCompact = compactSearchTerm(trimmed);
  const upgraded = ranked.map((match) => {
    if (match.key !== FEED_CUSTOM_ATTR_KEY) return match;
    const valueCompact = compactSearchTerm(match.value);
    if (
      valueCompact.length < qCompact.length &&
      qCompact.startsWith(valueCompact)
    ) {
      return { ...match, value: trimmed };
    }
    return match;
  });

  if (upgraded.length > 0) return dedupeFeedFilterMatches(upgraded);
  return [{ key: FEED_CUSTOM_ATTR_KEY, value: trimmed, source: "rules" }];
}

export function catalogEntryForMatch(
  catalog: FeedFilterMatch[],
  key: AttrKey,
  value: string
): FeedFilterMatch | null {
  const norm = normalizeCustomValue(value);
  return (
    catalog.find(
      (entry) =>
        entry.key === key && normalizeCustomValue(entry.value) === norm
    ) ?? null
  );
}

export function feedFilterCatalogForPrompt(
  attributeLibrary: AttributeLibrary
): string {
  return FEED_FILTER_ATTR_KEYS.map((key) => {
    const options = feedFilterOptionsForKey(key, attributeLibrary);
    return `${key} (${ATTR_OPTIONS[key].label}): ${options.join(" | ")}`;
  }).join("\n");
}
