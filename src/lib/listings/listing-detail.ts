import type { AppListing, ListingGender } from "./types";

const GENDER_LABELS: Record<ListingGender, string> = {
  mens: "Men's",
  womens: "Women's",
  unisex: "Unisex",
  unknown: "",
};

export function listingDescriptionText(listing: AppListing): string {
  return listing.description?.trim() || listing.title;
}

export function listingDetailRows(
  listing: AppListing
): { label: string; value: string }[] {
  const f = listing.features;
  const rows: { label: string; value: string }[] = [];

  const add = (label: string, value: string | number | null | undefined) => {
    if (value == null) return;
    const text = String(value).trim();
    if (text) rows.push({ label, value: text });
  };

  add("Model", f.model ?? listing.model);
  add("Year", f.year ?? listing.year);
  add("Era", f.era);
  add("Movement", f.mvmt);
  add("Dial", f.dial);
  add("Color", f.color);
  add("Crystal", f.crystal);
  add("Plating", f.plating);
  add("Running", f.running);
  add("Complete", f.complete);
  add("Date code", f.datecode);
  add("Dial originality", f.dialOrig);
  add("Collaboration", f.collab);
  add("Complications", f.complications);

  if (listing.isVintage) rows.push({ label: "Vintage", value: "Yes" });

  const genderLabel = GENDER_LABELS[listing.gender];
  add("Gender", genderLabel || undefined);
  add("Ships from", listing.sellerCountry);
  add("Source", listing.source);

  if (listing.listedAt) {
    const listed = new Date(listing.listedAt);
    if (!Number.isNaN(listed.getTime())) {
      rows.push({
        label: "Listed",
        value: listed.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    }
  }

  const priceText =
    listing.priceCurrency === "USD"
      ? `$${listing.priceValue.toFixed(2)}`
      : `${listing.priceValue} ${listing.priceCurrency}`;
  rows.push({ label: "List price", value: priceText });

  return rows;
}

export function listingSourceLabel(source: AppListing["source"]): string {
  if (source === "ebay") return "eBay";
  if (source === "chrono24") return "Chrono24";
  if (source === "etsy") return "Etsy";
  return source;
}
