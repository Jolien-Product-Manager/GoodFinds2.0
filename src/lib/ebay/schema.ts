import { z } from "zod";

export const EBAY_DEFAULT_QUERY = "timex vintage watch";
export const EBAY_WRISTWATCH_CATEGORY_ID = "31387";
/** Total listings to fetch across paginated Browse API calls. */
export const EBAY_SEARCH_LIMIT = 10000;
/** eBay Browse API max per request (pagination uses offset). */
export const EBAY_PAGE_SIZE = 200;
export const EBAY_BRAND = "Timex";

export const ebayPriceSchema = z.object({
  value: z.string(),
  currency: z.string().optional(),
});

export const ebayShippingOptionSchema = z.object({
  shippingCost: ebayPriceSchema.optional(),
  shippingCostType: z.string().optional(),
});

export const ebayItemSummarySchema = z.object({
  itemId: z.string(),
  title: z.string(),
  itemWebUrl: z.string().optional(),
  price: ebayPriceSchema.optional(),
  image: z
    .object({
      imageUrl: z.string().optional(),
    })
    .optional(),
  additionalImages: z
    .array(
      z.object({
        imageUrl: z.string().optional(),
      })
    )
    .optional(),
  condition: z.string().optional(),
  itemLocation: z
    .object({
      country: z.string().optional(),
    })
    .optional(),
  shippingOptions: z.array(ebayShippingOptionSchema).optional(),
});

export const ebaySearchResponseSchema = z.object({
  itemSummaries: z.array(ebayItemSummarySchema).optional(),
  total: z.number().optional(),
  warnings: z.array(z.object({ message: z.string().optional() })).optional(),
});

export type EbayItemSummary = z.infer<typeof ebayItemSummarySchema>;
