import type { Chrono24Listing } from "@/lib/chrono24/schema";
import type { EbayItemSummary } from "@/lib/ebay/schema";
import { shouldExcludeEbayTitle } from "@/lib/ebay/title-filter";
import { eraFromYear, matchListingToModel } from "@/lib/models/catalog";
import { inferListingGender } from "./gender";
import type { AppListing, ConditionGrade, ExtractedFeatures } from "./types";

const YEAR_RE = /\b(19[2-9]\d|20[0-2]\d)\b/;

export function parseYearFromTitle(title: string): number | null {
  const match = title.match(YEAR_RE);
  return match ? parseInt(match[1], 10) : null;
}

export function isVintageListing(title: string, year: number | null): boolean {
  if (title.toLowerCase().includes("vintage")) return true;
  return year != null && year <= 2000;
}

function inferCondition(title: string, sourceCondition?: string): ConditionGrade {
  const lower = `${title} ${sourceCondition ?? ""}`.toLowerCase();
  if (lower.includes("for parts") || lower.includes("not working")) {
    return "For parts / project";
  }
  if (lower.includes("needs battery")) return "Needs battery";
  if (lower.includes("nos") || lower.includes("unworn")) return "NOS / unworn";
  if (lower.includes("excellent")) return "Excellent";
  if (lower.includes("patina")) return "Honest patina";
  if (lower.includes("good") || lower.includes("worn")) return "Good / worn";
  return "Unknown";
}

function buildFeatures(
  title: string,
  year: number | null,
  model: string | null,
  condition: ConditionGrade
): ExtractedFeatures {
  const era = eraFromYear(year);
  return {
    model: model ?? undefined,
    year: year ?? undefined,
    era,
    cond: condition,
    confidence: {
      model: model ? "low" : undefined,
      era: year ? "medium" : undefined,
      cond: "low",
    },
  };
}

export function normalizeChrono24Listing(raw: Chrono24Listing): AppListing | null {
  if (!raw.listing_id || raw.price_value == null) return null;

  const year = raw.year ?? parseYearFromTitle(raw.title);
  const model = matchListingToModel(raw.title);
  const condition = inferCondition(raw.title);

  return {
    id: raw.listing_id,
    source: "chrono24",
    title: raw.title,
    url: raw.url,
    imageUrl: raw.image_url ?? null,
    priceValue: raw.price_value,
    priceCurrency: raw.price_currency ?? "USD",
    year,
    isVintage: raw.is_vintage ?? isVintageListing(raw.title, year),
    model,
    condition,
    shippingCost: null,
    shippingConfirmed: false,
    sellerCountry: null,
    listedAt: new Date().toISOString(),
    gender: inferListingGender(raw.title),
    features: buildFeatures(raw.title, year, model, condition),
  };
}

export function normalizeEbayListing(raw: EbayItemSummary): AppListing | null {
  if (!raw.itemId || !raw.price?.value) return null;
  if (shouldExcludeEbayTitle(raw.title)) return null;

  const priceValue = parseFloat(raw.price.value);
  if (Number.isNaN(priceValue)) return null;

  const year = parseYearFromTitle(raw.title);
  const model = matchListingToModel(raw.title);
  const condition = inferCondition(raw.title, raw.condition);

  const domesticShipping = raw.shippingOptions?.find(
    (o) => o.shippingCost?.value
  );
  const shippingCost = domesticShipping?.shippingCost?.value
    ? parseFloat(domesticShipping.shippingCost.value)
    : null;

  const namespacedId = `ebay-${raw.itemId.replace(/\|/g, "-")}`;

  return {
    id: namespacedId,
    source: "ebay",
    title: raw.title,
    url: raw.itemWebUrl ?? `https://www.ebay.com/itm/${raw.itemId}`,
    imageUrl: raw.image?.imageUrl ?? null,
    priceValue,
    priceCurrency: raw.price.currency ?? "USD",
    year,
    isVintage: isVintageListing(raw.title, year),
    model,
    condition,
    shippingCost,
    shippingConfirmed: shippingCost != null,
    sellerCountry: raw.itemLocation?.country ?? null,
    listedAt: new Date().toISOString(),
    gender: inferListingGender(raw.title),
    features: buildFeatures(raw.title, year, model, condition),
  };
}

export function filterVintageListings(listings: AppListing[]): AppListing[] {
  return listings.filter((l) => l.isVintage);
}
