import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "scripts/chrono24/vintage_timex.json");
const dest = path.join(process.cwd(), "data/chrono24/vintage_timex.json");

if (!fs.existsSync(src)) {
  console.warn("No scraper output at scripts/chrono24/vintage_timex.json — skipping sync.");
  process.exit(0);
}

const raw = JSON.parse(fs.readFileSync(src, "utf-8"));
const count = Array.isArray(raw.listings) ? raw.listings.length : 0;

if (count === 0) {
  console.warn(
    "Scraper returned 0 listings — keeping existing data/chrono24/vintage_timex.json."
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Synced ${count} listings to ${dest}`);
