import {
  mergeDefaultPurchasedWatches,
  normalizePurchasedWatch,
} from "@/lib/hunts/purchased-watch";
import type { PurchasedWatch } from "@/lib/hunts/types";
import { normalizeAllowedConditions } from "@/lib/listings/condition-filter";
import {
  DEFAULT_PERSISTED_STATE,
  type PersistedState,
} from "@/lib/persistence/types";

/** Normalize persisted user state — repairs legacy condition values and defaults. */
export function normalizePersistedState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PERSISTED_STATE;
  }
  const merged = { ...DEFAULT_PERSISTED_STATE, ...(raw as Partial<PersistedState>) };
  merged.purchasedWatches = mergeDefaultPurchasedWatches(
    (merged.purchasedWatches ?? []).map((watch) =>
      normalizePurchasedWatch(watch as PurchasedWatch)
    )
  );
  merged.globalFilters = {
    ...DEFAULT_PERSISTED_STATE.globalFilters,
    ...merged.globalFilters,
    allowedConditions: normalizeAllowedConditions(
      merged.globalFilters?.allowedConditions ?? merged.criteria?.allowedConditions,
      merged.criteria?.excludeForParts
    ),
  };
  merged.criteria = {
    ...merged.criteria,
    allowedConditions: merged.globalFilters.allowedConditions,
    excludeForParts: !merged.globalFilters.allowedConditions.includes(
      "For parts / project"
    ),
  };
  return merged;
}
