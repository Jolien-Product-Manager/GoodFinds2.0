export type ListingSource = "chrono24" | "ebay";

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
  dial?: string;
  color?: string;
  case?: string;
  mvmt?: string;
  cond?: ConditionGrade;
  collab?: string;
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
  features: ExtractedFeatures;
}

export interface CriteriaSettings {
  maxTotalCost: number | null;
  maxTotalCostEnabled: boolean;
  shipsToMe: boolean;
  region: string;
  postalCode: string;
  excludeForParts: boolean;
}

export interface ListingStatus {
  interested?: boolean;
}

export type AlertScope = "all" | "watchlist" | "top" | `hunt:${string}`;
