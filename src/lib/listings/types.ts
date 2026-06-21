export type ListingSource = "chrono24" | "ebay" | "etsy";

export type ListingGender = "mens" | "womens" | "unisex" | "unknown";

export type ConditionGrade =
  | "Deadstock"
  | "NOS / unworn"
  | "Excellent"
  | "Good / worn"
  | "Honest patina"
  | "Needs battery"
  | "For parts / project"
  | "Unknown";

export interface ExtractedFeatures {
  model?: string;
  year?: number;
  era?: string;
  datecode?: string;
  dialOrig?: string;
  plating?: string;
  crystal?: string;
  running?: string;
  complete?: string;
  dial?: string;
  color?: string;
  mvmt?: string;
  /** @deprecated Use buyer-axis fields (running, complete, plating, …). */
  cond?: ConditionGrade;
  collab?: string;
  complications?: string;
  /** @deprecated Migrated to `complete`. */
  storeFind?: string;
  confidence: Partial<
    Record<keyof Omit<ExtractedFeatures, "confidence">, "high" | "medium" | "low">
  >;
}

export interface AppListing {
  id: string;
  source: ListingSource;
  title: string;
  url: string;
  imageUrl: string | null;
  imageUrls: string[];
  priceValue: number;
  priceCurrency: string;
  year: number | null;
  isVintage: boolean;
  model: string | null;
  condition: ConditionGrade;
  shippingCost: number | null;
  shippingConfirmed: boolean;
  sellerCountry: string | null;
  listedAt: string;
  gender: ListingGender;
  /** Marketplace listing body text when available (e.g. Etsy). Used for gender inference. */
  description?: string | null;
  features: ExtractedFeatures;
}

export interface CriteriaSettings {
  maxTotalCost: number | null;
  maxTotalCostEnabled: boolean;
  shipsToMe: boolean;
  region: string;
  postalCode: string;
  excludeForParts: boolean;
  allowedConditions?: ConditionGrade[];
}

export interface ListingStatus {
  interested?: boolean;
}

export type AlertScope = "all" | "watchlist" | `hunt:${string}`;

export type MarketplaceFilter = "all" | ListingSource;
