import type { FeedView } from "@/store/caseback";
import type {
  AlertScope,
  CriteriaSettings,
  ListingStatus,
  MarketplaceFilter,
  AppListing,
} from "@/lib/listings/types";
import type { Hunt, HuntAttribute, AttrKey } from "@/lib/hunts/types";
import type { HuntMatchResult } from "@/lib/listings/hunt-match";

export const FEED_DEFAULT_LIMIT = 40;
export const FEED_MAX_LIMIT = 100;

export interface FeedQueryBody {
  cursor?: number;
  limit?: number;
  feedView: FeedView;
  alertScope: AlertScope;
  marketplaceFilter: MarketplaceFilter;
  seen: string[];
  dismissed: string[];
  listingStatus: Record<string, ListingStatus>;
  hiddenListings: string[];
  dislikedModels: string[];
  criteria: CriteriaSettings;
  feedAttributeFilters: Partial<Record<AttrKey, HuntAttribute>>;
  hunts: Hunt[];
  refresh?: boolean;
  unseenOnly?: boolean;
}

export interface FeedItem {
  listing: AppListing;
  match: HuntMatchResult | null;
}

export interface FeedPageResponse {
  items: FeedItem[];
  nextCursor: number | null;
  total: number;
}

export interface FeedCountsResponse {
  all: number;
  new: number;
  starred: number;
  dismissed: number;
  huntMatches: number;
  perHunt: Record<string, number>;
  marketplace: {
    all: number;
    ebay: number;
    chrono24: number;
    etsy: number;
  };
}
