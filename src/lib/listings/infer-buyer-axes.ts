import type { ConditionGrade } from "./types";

const DATE_CODE_RE = /\bM([0-9]{2})\b/i;

const DIAL_ORIG_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Redial", keywords: ["redial", "re-dial", "redialed"] },
  { label: "Repaint / refinish", keywords: ["repaint", "refinish", "restored dial"] },
  { label: "Original dial", keywords: ["original dial", "factory dial", "oem dial"] },
  { label: "Likely original", keywords: ["untouched dial", "unrestored dial"] },
];

const PLATING_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Heavy brassing", keywords: ["heavy brass", "brassing", "brassed"] },
  { label: "Brass showing", keywords: ["brass showing", "brass through", "worn plating"] },
  { label: "Re-plated", keywords: ["re-plated", "replated", "replate"] },
  { label: "Intact plating", keywords: ["intact plating", "plating intact", "gold filled"] },
  { label: "Stainless / no plate", keywords: ["stainless steel", "stainless case", "ss case"] },
];

const CRYSTAL_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Cracked / damaged", keywords: ["cracked crystal", "broken crystal", "chipped crystal"] },
  { label: "Replacement acrylic", keywords: ["replacement crystal", "new crystal", "aftermarket crystal"] },
  { label: "Original acrylic", keywords: ["original crystal", "acrylic crystal", "plexiglass", "hesalite"] },
  { label: "Scratches only", keywords: ["scratched crystal", "light scratches"] },
];

const RUNNING_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "For parts / movement", keywords: ["for parts", "parts watch", "movement only"] },
  { label: "Not running", keywords: ["not running", "non running", "non-working", "non working", "doesn't run", "does not run", "stopped"] },
  { label: "Running weak", keywords: ["runs weak", "running weak", "slow runner"] },
  { label: "Running", keywords: ["running", "runs well", "keeps time", "working order", "fully functional"] },
  { label: "Untested", keywords: ["untested", "unknown if running", "not tested"] },
];

export const COMPLETENESS_KEYWORDS: { label: string; keywords: string[] }[] = [
  {
    label: "Full set (box + papers)",
    keywords: ["box and papers", "box & papers", "full set", "complete set"],
  },
  { label: "Box only", keywords: ["with box", "w/ box", "original box", "mint in box", "mib"] },
  { label: "Papers only", keywords: ["with papers", "papers included", "certificate"] },
  { label: "NOS / unworn", keywords: ["nos", "new old stock", "unworn"] },
  { label: "Tags attached", keywords: ["tags attached", "with tags", "hang tag"] },
];

function titleHas(lower: string, phrase: string): boolean {
  return lower.includes(phrase.toLowerCase());
}

function matchKeywordMap(
  title: string,
  map: { label: string; keywords: string[] }[]
): string | undefined {
  const lower = title.toLowerCase();
  for (const { label, keywords } of map) {
    if (keywords.some((kw) => titleHas(lower, kw))) return label;
  }
  return undefined;
}

export function inferDateCodeFromTitle(title: string): string | undefined {
  const match = title.match(DATE_CODE_RE);
  if (!match) return undefined;
  return `M${match[1]}`;
}

export function inferDialOrigFromTitle(title: string): string | undefined {
  return matchKeywordMap(title, DIAL_ORIG_KEYWORDS);
}

export function inferPlatingFromTitle(title: string): string | undefined {
  return matchKeywordMap(title, PLATING_KEYWORDS);
}

export function inferCrystalFromTitle(title: string): string | undefined {
  return matchKeywordMap(title, CRYSTAL_KEYWORDS);
}

export function inferRunningFromTitle(title: string): string | undefined {
  return matchKeywordMap(title, RUNNING_KEYWORDS);
}

export function inferCompletenessFromTitle(title: string): string | undefined {
  return matchKeywordMap(title, COMPLETENESS_KEYWORDS);
}

export function runningFromCondition(condition: ConditionGrade): string | undefined {
  switch (condition) {
    case "For parts / project":
      return "For parts / movement";
    case "Needs battery":
      return "Untested";
    default:
      return undefined;
  }
}

export function completenessFromCondition(condition: ConditionGrade): string | undefined {
  switch (condition) {
    case "NOS / unworn":
      return "NOS / unworn";
    default:
      return undefined;
  }
}

export function completenessPickMatchesTitle(wantedRaw: string, title: string): boolean {
  const wanted = wantedRaw.trim().toLowerCase();
  const resolved = inferCompletenessFromTitle(title);
  if (resolved && resolved.toLowerCase() === wanted) return true;

  const entry = COMPLETENESS_KEYWORDS.find((e) => e.label.toLowerCase() === wanted);
  if (entry) {
    const lower = title.toLowerCase();
    return entry.keywords.some((kw) => titleHas(lower, kw));
  }

  if (resolved) {
    const norm = resolved.toLowerCase();
    return norm.includes(wanted) || wanted.includes(norm);
  }

  return titleHas(title.toLowerCase(), wantedRaw);
}
