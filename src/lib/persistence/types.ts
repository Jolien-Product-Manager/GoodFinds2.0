import type {
  CriteriaSettings,
  ListingStatus,
  AlertScope,
  MarketplaceFilter,
} from "@/lib/listings/types";
import type { Hunt, GlobalFilters, PurchasedWatch, AttrKey, HuntAttribute } from "@/lib/hunts/types";
import { emptyHuntAttributes } from "@/lib/hunts/types";
import type { FeedView } from "@/store/caseback";
import { DEFAULT_ALLOWED_CONDITIONS } from "@/lib/listings/condition-filter";

export type AttributeLibrary = Partial<Record<AttrKey, string[]>>;

export interface PersistedState {
  seen: string[];
  dismissed: string[];
  listingStatus: Record<string, ListingStatus>;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  feedView: FeedView;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
}

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  seen: [],
  dismissed: [],
  listingStatus: {},
  alertScope: "all",
  marketplaceFilter: "all",
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
    allowedConditions: DEFAULT_ALLOWED_CONDITIONS,
  },
  hunts: [],
  globalFilters: {
    priceCeiling: 50,
    shipsToMe: true,
    postalCode: "M6K1V8",
    allowedConditions: DEFAULT_ALLOWED_CONDITIONS,
  },
  purchasedWatches: [],
  attributeLibrary: {},
  attributeHidden: {},
  feedAttributeFilters: emptyHuntAttributes(),
};
