import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { etsyListingSchema, type EtsyListing } from "./schema";

const CACHE_PATH = path.join(process.cwd(), "data/etsy/vintage_timex.json");

const etsySnapshotSchema = z.object({
  fetched_at: z.string(),
  listings: z.array(etsyListingSchema),
});

export function readEtsySnapshot(): EtsyListing[] | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    const parsed = etsySnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("Etsy cache validation failed:", parsed.error.message);
      return null;
    }
    return parsed.data.listings;
  } catch (err) {
    console.warn("Failed to read Etsy cache:", err);
    return null;
  }
}

export function writeEtsySnapshot(listings: EtsyListing[]): void {
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
    console.warn("Failed to write Etsy cache:", err);
  }
}

export function etsySnapshotAgeMinutes(): number | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    const parsed = etsySnapshotSchema.safeParse(raw);
    if (!parsed.success) return null;
    const ageMs = Date.now() - new Date(parsed.data.fetched_at).getTime();
    return Math.round(ageMs / 60_000);
  } catch {
    return null;
  }
}
