import { z } from "zod";

export const ETSY_DEFAULT_QUERY = "vintage timex watch";
/** Etsy max per page for findAllListingsActive. */
export const ETSY_PAGE_SIZE = 100;
/** Max listings for manual sync (`npm run sync:etsy`). Override via ETSY_SEARCH_LIMIT env. */
export const ETSY_SEARCH_LIMIT = 500;

export const etsyMoneySchema = z.object({
  amount: z.number(),
  divisor: z.number(),
  currency_code: z.string(),
});

export const etsyListingImageSchema = z.object({
  listing_image_id: z.number().optional(),
  url_fullxfull: z.string().optional(),
  url_570xN: z.string().optional(),
  url_170x135: z.string().optional(),
});

export const etsyListingSchema = z.object({
  listing_id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  state: z.string().optional(),
  url: z.string().optional(),
  price: etsyMoneySchema.optional(),
  quantity: z.number().optional(),
  tags: z.array(z.string()).optional(),
  shop_id: z.number().optional(),
  creation_timestamp: z.number().optional(),
  original_creation_timestamp: z.number().optional(),
  is_vintage: z.boolean().optional(),
  when_made: z.string().optional(),
  images: z.array(etsyListingImageSchema).optional(),
});

export const etsySearchResponseSchema = z.object({
  count: z.number().optional(),
  results: z.array(etsyListingSchema).optional(),
});

export type EtsyListing = z.infer<typeof etsyListingSchema>;
export type EtsyListingImage = z.infer<typeof etsyListingImageSchema>;

export function etsyPriceValue(
  price: z.infer<typeof etsyMoneySchema> | undefined
): number | null {
  if (!price || !price.divisor) return null;
  return price.amount / price.divisor;
}

export function etsyListingUrl(listingId: number, url?: string): string {
  if (url?.startsWith("https://")) return url;
  return `https://www.etsy.com/listing/${listingId}`;
}

export function etsyListingImageUrls(listing: EtsyListing): string[] {
  const urls: string[] = [];
  for (const img of listing.images ?? []) {
    const url = img.url_fullxfull ?? img.url_570xN ?? img.url_170x135;
    if (url) urls.push(url);
  }
  return urls;
}
