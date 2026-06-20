import type { CriteriaSettings, ListingStatus, AlertScope } from "@/lib/listings/types";
import type { Hunt, GlobalFilters, PurchasedWatch } from "@/lib/hunts/types";
import type { FeedView } from "@/store/caseback";

export interface PersistedState {
  seen: string[];
  listingStatus: Record<string, ListingStatus>;
  alertScope: AlertScope;
  feedView: FeedView;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
}

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  seen: [],
  listingStatus: {},
  alertScope: "all",
  feedView: "new",
  hiddenListings: [],
  dislikedModels: [],
  criteria: {
    maxTotalCost: 50,
    maxTotalCostEnabled: true,
    shipsToMe: true,
    region: "CA",
    postalCode: "M6K1V8",
    excludeForParts: true,
  },
  hunts: [],
  globalFilters: {
    priceCeiling: 50,
    shipsToMe: true,
    postalCode: "M6K1V8",
  },
  purchasedWatches: [],
};
