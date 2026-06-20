import fs from "node:fs";
import path from "node:path";
import { chrono24SnapshotSchema, type Chrono24Listing } from "./schema";

const DATA_PATH = path.join(process.cwd(), "data/chrono24/vintage_timex.json");

export function loadChrono24Listings(): Chrono24Listing[] {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.warn("Chrono24 data file missing:", DATA_PATH);
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const parsed = chrono24SnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("Chrono24 data validation failed:", parsed.error.message);
      return [];
    }
    return parsed.data.listings;
  } catch (err) {
    console.warn("Failed to load Chrono24 listings:", err);
    return [];
  }
}
