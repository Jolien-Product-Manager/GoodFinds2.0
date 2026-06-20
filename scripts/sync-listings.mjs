import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "scripts/chrono24/vintage_timex.json");
const dest = path.join(process.cwd(), "data/chrono24/vintage_timex.json");

if (!fs.existsSync(src)) {
  console.warn("No scraper output at scripts/chrono24/vintage_timex.json — skipping sync.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Synced listings to ${dest}`);
