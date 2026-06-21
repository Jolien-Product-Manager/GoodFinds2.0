import type {
  CriteriaSettings,
  ListingStatus,
  MarketplaceFilter,
  MatchQualityLevel,
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
  selectedHuntIds: string[];
  selectedMatchQualities: MatchQualityLevel[];
  marketplaceFilter: MarketplaceFilter;
  feedView: FeedView;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  hunts: Hunt[];
  globalFilters: GlobalFilters;
  savedGlobalFilters: GlobalFilters;
  purchasedWatches: PurchasedWatch[];
  attributeLibrary: AttributeLibrary;
  attributeHidden: AttributeLibrary;
  feedAttributeFilters: Record<AttrKey, HuntAttribute>;
}

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  seen: [],
  dismissed: [],
  listingStatus: {},
  selectedHuntIds: [],
  selectedMatchQualities: [],
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
  savedGlobalFilters: {
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
