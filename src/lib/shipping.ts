import type { AppListing, CriteriaSettings } from "@/lib/listings/types";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic shipping estimate when marketplace doesn't provide it. */
export function estimateShipping(listing: AppListing, postalCode: string): number {
  const seed = hashString(`${listing.id}-${postalCode}`);
  const base = listing.source === "chrono24" ? 12 : 8;
  return base + (seed % 10);
}

export function getTotalCost(
  listing: AppListing,
  postalCode: string
): { item: number; shipping: number; total: number; shippingConfirmed: boolean } {
  const item = listing.priceValue;
  const shipping =
    listing.shippingCost != null
      ? listing.shippingCost
      : estimateShipping(listing, postalCode);
  const shippingConfirmed = listing.shippingConfirmed;
  return { item, shipping, total: item + shipping, shippingConfirmed };
}

export function passesCriteria(
  listing: AppListing,
  criteria: CriteriaSettings
): boolean {
  if (criteria.excludeForParts && listing.condition === "For parts / project") {
    return false;
  }

  const { total } = getTotalCost(listing, criteria.postalCode);

  if (criteria.maxTotalCostEnabled && criteria.maxTotalCost != null) {
    if (total > criteria.maxTotalCost) return false;
  }

  if (criteria.shipsToMe) {
    // Without live ship-to API, allow domestic CA/US sellers and unknown
    if (listing.sellerCountry && !["CA", "US"].includes(listing.sellerCountry)) {
      return false;
    }
  }

  return true;
}
