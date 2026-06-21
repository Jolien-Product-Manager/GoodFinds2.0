import { readFileSync, existsSync } from "node:fs";
import { fetchEbayListings } from "../src/lib/ebay/client";
import { EBAY_SEARCH_LIMIT } from "../src/lib/ebay/schema";

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  // One-time manual sync: paginate up to EBAY_SEARCH_LIMIT with production rate limits.
  process.env.EBAY_FORCE_REFRESH = "1";
  process.env.EBAY_SYNC = "1";
  process.env.EBAY_RATE_LIMIT_MODE = "production";
  process.env.EBAY_SEARCH_LIMIT = String(EBAY_SEARCH_LIMIT);
  const listings = await fetchEbayListings();
  console.log(`Fetched ${listings.length} eBay listings`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
