import { readFileSync, existsSync } from "node:fs";
import { fetchEtsyListings } from "../src/lib/etsy/client";

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
  process.env.ETSY_FORCE_REFRESH = "1";
  const listings = await fetchEtsyListings();
  console.log(`Fetched ${listings.length} Etsy listings`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
