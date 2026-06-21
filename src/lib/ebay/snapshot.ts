import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ebayItemSummarySchema, type EbayItemSummary } from "./schema";

const CACHE_PATH = path.join(process.cwd(), "data/ebay/vintage_timex.json");

const ebaySnapshotSchema = z.object({
  fetched_at: z.string(),
  listings: z.array(ebayItemSummarySchema),
});

export function readEbaySnapshot(): EbayItemSummary[] | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    const parsed = ebaySnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("eBay cache validation failed:", parsed.error.message);
      return null;
    }
    return parsed.data.listings;
  } catch (err) {
    console.warn("Failed to read eBay cache:", err);
    return null;
  }
}

export function writeEbaySnapshot(listings: EbayItemSummary[]): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(
      CACHE_PATH,
      JSON.stringify(
        {
          fetched_at: new Date().toISOString(),
          listings,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.warn("Failed to write eBay cache:", err);
  }
}

export function ebaySnapshotAgeMinutes(): number | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    const parsed = ebaySnapshotSchema.safeParse(raw);
    if (!parsed.success) return null;
    const ageMs = Date.now() - new Date(parsed.data.fetched_at).getTime();
    return Math.round(ageMs / 60_000);
  } catch {
    return null;
  }
}
