import { normalizeCustomValue } from "@/lib/hunts/types";

function searchText(title: string, description?: string | null): string {
  return normalizeCustomValue([title, description].filter(Boolean).join(" "));
}

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
    /\bdual time\b/,
    /\bsecond time zone\b/,
    /\b2nd time zone\b/,
  ],
  Alarm: [/\balarm\b/],
  "Moon phase": [/\bmoon phase\b/, /\bmoonphase\b/, /\bsun moon\b/],
  "Power reserve indicator": [/\bpower reserve\b/],
  "Indiglo night-light": [/\bindiglo\b/, /\bnight[\s-]?light\b/],
  "World time": [/\bworld time\b/, /\bworldtimer\b/],
  "Pointer date": [/\bpointer date\b/, /\bdate hand\b/],
};

export function complicationPickMatchesListing(
  pick: string,
  title: string,
  description?: string | null
): boolean {
  const haystack = searchText(title, description);
  if (!haystack) return false;

  const patterns = COMPLICATION_PATTERNS[pick];
  if (patterns?.some((re) => re.test(haystack))) return true;

  const norm = normalizeCustomValue(pick);
  if (norm && haystack.includes(norm)) return true;

  // Match parenthetical aliases, e.g. "Chronograph" → "Chronograph (stopwatch)".
  const base = normalizeCustomValue(pick.replace(/\s*\([^)]*\)\s*$/, ""));
  return Boolean(base && haystack.includes(base));
}
