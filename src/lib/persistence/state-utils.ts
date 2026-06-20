import type { PersistedState } from "@/lib/persistence/types";

export function isPersistedStateEmpty(state: PersistedState): boolean {
  return (
    state.seen.length === 0 &&
    state.hunts.length === 0 &&
    state.purchasedWatches.length === 0 &&
    Object.keys(state.listingStatus).length === 0
  );
}
