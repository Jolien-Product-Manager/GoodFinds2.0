import type { Chrono24Listing } from "@/lib/chrono24/schema";
import { canonicalizeChrono24Url } from "@/lib/chrono24/urls";
import type { EbayItemSummary } from "@/lib/ebay/schema";
import { shouldExcludeEbayTitle } from "@/lib/ebay/title-filter";
import type { EtsyListing } from "@/lib/etsy/schema";
import {
  etsyListingImageUrls,
  etsyListingUrl,
  etsyPriceValue,
} from "@/lib/etsy/schema";
import { shouldExcludeEtsyTitle } from "@/lib/etsy/title-filter";
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
  if (lower.includes("deadstock") || lower.includes("dead stock")) return "Deadstock";
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

function collectImageUrls(urls: Array<string | null | undefined>, max = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
    if (result.length >= max) break;
  }
  return result;
}

function chrono24ImageUrls(raw: Chrono24Listing): string[] {
  if (raw.image_urls?.length) {
    return collectImageUrls(raw.image_urls);
  }
  return collectImageUrls([raw.image_url]);
}

function ebayImageUrls(raw: EbayItemSummary): string[] {
  return collectImageUrls([
    raw.image?.imageUrl,
    ...(raw.additionalImages ?? []).map((img) => img.imageUrl),
  ]);
}

export function normalizeChrono24Listing(raw: Chrono24Listing): AppListing | null {
  if (!raw.listing_id || raw.price_value == null) return null;

  const year = raw.year ?? parseYearFromTitle(raw.title);
  const model = matchListingToModel(raw.title);
  const condition = inferCondition(raw.title);
  const imageUrls = chrono24ImageUrls(raw);

  return {
    id: raw.listing_id,
    source: "chrono24",
    title: raw.title,
    url: canonicalizeChrono24Url(raw.listing_id, raw.url),
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
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
  const imageUrls = ebayImageUrls(raw);

  return {
    id: namespacedId,
    source: "ebay",
    title: raw.title,
    url: raw.itemWebUrl ?? `https://www.ebay.com/itm/${raw.itemId}`,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
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

export function normalizeEtsyListing(raw: EtsyListing): AppListing | null {
  if (!raw.listing_id || !raw.title) return null;
  if (shouldExcludeEtsyTitle(raw.title)) return null;

  const priceValue = etsyPriceValue(raw.price);
  if (priceValue == null) return null;

  const year = parseYearFromTitle(raw.title);
  const model = matchListingToModel(raw.title);
  const condition = inferCondition(raw.title);
  const imageUrls = etsyListingImageUrls(raw);
  const listedAt = raw.creation_timestamp
    ? new Date(raw.creation_timestamp * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: `etsy-${raw.listing_id}`,
    source: "etsy",
    title: raw.title,
    url: etsyListingUrl(raw.listing_id, raw.url),
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    priceValue,
    priceCurrency: raw.price?.currency_code ?? "USD",
    year,
    isVintage:
      raw.is_vintage === true || isVintageListing(raw.title, year),
    model,
    condition,
    shippingCost: null,
    shippingConfirmed: false,
    sellerCountry: null,
    listedAt,
    gender: inferListingGender(raw.title),
    features: buildFeatures(raw.title, year, model, condition),
  };
}

export function filterVintageListings(listings: AppListing[]): AppListing[] {
  return listings.filter((l) => l.isVintage);
}
