import { normalizeCustomValue } from "@/lib/hunts/types";

/** Title/description patterns for preset complication picks. */
const COMPLICATION_PATTERNS: Record<string, RegExp[]> = {
  Date: [/\bdate\b/],
  "Day-date (day + date)": [
    /\bday[\s-]?date\b/,
    /\bday\s*&\s*date\b/,
    /\bday and date\b/,
  ],
  "Day of week": [/\bday of (the )?week\b/, /\bweekday\b/, /\bday name\b/],
  "Sweep seconds": [/\bsweep(ing)? second/],
  "Sub-seconds": [/\bsub[\s-]?second/, /\bsmall second/],
  "24-hour indicator": [/\b24[\s-]?hour/, /\bmilitary time\b/],
  "Calendar (full)": [/\bfull calendar\b/, /\bperpetual calendar\b/],
  "Chronograph (stopwatch)": [/\bchronograph\b/, /\bchrono\b/, /\bstopwatch\b/],
  "Tachymeter scale": [/\btachymet/, /\btachy scale\b/],
  "Rotating dive bezel": [
    /\brotating bezel\b/,
    /\bdive bezel\b/,
    /\bunidirectional bezel\b/,
  ],
  "GMT / dual time": [
    /\bgmt\b/,
    /\bdual[\s-]?time\b/,
    /\bdual[\s-]?hour\b/,
    /\btime[\s-]?zone\b/,
    /\btimezone\b/,
    /\bsecond time zone\b/,
    /\b2nd time zone\b/,
    /\bdouble time\b/,
  ],
  Alarm: [/\balarm\b/],
  "Moon phase": [/\bmoon phase\b/, /\bmoonphase\b/, /\bsun moon\b/],
  "Power reserve indicator": [/\bpower reserve\b/],
  "Indiglo night-light": [/\bindiglo\b/, /\bnight[\s-]?light\b/],
  "World time": [/\bworld time\b/, /\bworldtimer\b/],
  "Pointer date": [/\bpointer date\b/, /\bdate hand\b/],
};

function searchText(title: string, description?: string | null): string {
  return normalizeCustomValue([title, description].filter(Boolean).join(" "));
}

function complicationPatternsForPick(pick: string): RegExp[] | undefined {
  if (COMPLICATION_PATTERNS[pick]) return COMPLICATION_PATTERNS[pick];
  const norm = normalizeCustomValue(pick);
  for (const [label, patterns] of Object.entries(COMPLICATION_PATTERNS)) {
    if (normalizeCustomValue(label) === norm) return patterns;
  }
  return undefined;
}

export function complicationPickMatchesListing(
  pick: string,
  title: string,
  description?: string | null
): boolean {
  const haystack = searchText(title, description);
  if (!haystack) return false;

  const patterns = complicationPatternsForPick(pick);
  if (patterns?.some((re) => re.test(haystack))) return true;

  const norm = normalizeCustomValue(pick);
  if (norm && haystack.includes(norm)) return true;

  // Match parenthetical aliases, e.g. "Chronograph" → "Chronograph (stopwatch)".
  const base = normalizeCustomValue(pick.replace(/\s*\([^)]*\)\s*$/, ""));
  return Boolean(base && haystack.includes(base));
}
