import type { CriteriaSettings } from "@/lib/listings/types";
import { DEFAULT_ALLOWED_CONDITIONS } from "@/lib/listings/condition-filter";

export const DEFAULT_CRITERIA: CriteriaSettings = {
  maxTotalCost: 50,
  maxTotalCostEnabled: true,
  shipsToMe: true,
  region: "CA",
  postalCode: "M6K1V8",
  excludeForParts: true,
  allowedConditions: DEFAULT_ALLOWED_CONDITIONS,
};
