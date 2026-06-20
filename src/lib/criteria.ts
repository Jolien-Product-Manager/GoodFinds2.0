import type { CriteriaSettings } from "@/lib/listings/types";

export const DEFAULT_CRITERIA: CriteriaSettings = {
  maxTotalCost: 50,
  maxTotalCostEnabled: true,
  shipsToMe: true,
  region: "CA",
  postalCode: "M6K1V8",
  excludeForParts: true,
};
