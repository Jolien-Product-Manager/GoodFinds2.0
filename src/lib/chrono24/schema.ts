import { z } from "zod";

export const chrono24ListingSchema = z.object({
  listing_id: z.string(),
  title: z.string(),
  price_value: z.number().nullable(),
  price_currency: z.string().nullable(),
  url: z.string(),
  image_url: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  is_vintage: z.boolean().optional(),
  source: z.literal("chrono24").optional(),
});

export const chrono24SnapshotSchema = z.object({
  scraped_at: z.string().optional(),
  query_count: z.number().optional(),
  listing_count: z.number().optional(),
  listings: z.array(chrono24ListingSchema),
});

export type Chrono24Listing = z.infer<typeof chrono24ListingSchema>;
export type Chrono24Snapshot = z.infer<typeof chrono24SnapshotSchema>;
