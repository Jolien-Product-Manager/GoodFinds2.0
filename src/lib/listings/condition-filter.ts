import type { ConditionGrade } from "./types";

export const CONDITION_FILTER_OPTIONS: {
  value: ConditionGrade;
  label: string;
  hint: string;
}[] = [
  { value: "Deadstock", label: "Deadstock", hint: "New old stock, never sold" },
  { value: "NOS / unworn", label: "NOS / unworn", hint: "New old stock or never worn" },
  { value: "Excellent", label: "Excellent", hint: "Light wear, fully functional" },
  { value: "Good / worn", label: "Good / worn", hint: "Normal vintage wear" },
  { value: "Honest patina", label: "Honest patina", hint: "Visible age, still wearable" },
  {
    value: "Needs battery",
    label: "Needs battery",
    hint: "Likely fine — may just need a new cell",
  },
  { value: "Unknown", label: "Unknown", hint: "Seller did not state condition clearly" },
  {
    value: "For parts / project",
    label: "For parts / project",
    hint: "Not working or explicitly a repair project",
  },
];

/** Default: everything except broken / for-parts listings. */
export const DEFAULT_ALLOWED_CONDITIONS: ConditionGrade[] =
  CONDITION_FILTER_OPTIONS.filter((o) => o.value !== "For parts / project").map(
    (o) => o.value
  );

export function normalizeAllowedConditions(
  raw: ConditionGrade[] | undefined,
  legacyExcludeForParts?: boolean
): ConditionGrade[] {
  if (raw && raw.length > 0) return raw;
  if (legacyExcludeForParts === false) {
    return CONDITION_FILTER_OPTIONS.map((o) => o.value);
  }
  return DEFAULT_ALLOWED_CONDITIONS;
}

export function toggleAllowedCondition(
  current: ConditionGrade[],
  grade: ConditionGrade
): ConditionGrade[] {
  if (current.includes(grade)) {
    if (current.length === 1) return current;
    return current.filter((value) => value !== grade);
  }
  return [...current, grade];
}

export function passesConditionFilter(
  condition: ConditionGrade,
  allowedConditions: ConditionGrade[] | undefined
): boolean {
  if (!allowedConditions || allowedConditions.length === 0) return true;
  return allowedConditions.includes(condition);
}
