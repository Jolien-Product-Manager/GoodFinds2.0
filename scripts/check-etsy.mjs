import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function getApiKey() {
  const combined = process.env.ETSY_API_KEY?.trim();
  if (combined) return combined;
  const keystring = process.env.ETSY_KEYSTRING?.trim();
  const sharedSecret = process.env.ETSY_SHARED_SECRET?.trim();
  if (keystring && sharedSecret) return `${keystring}:${sharedSecret}`;
  return null;
}

loadEnvLocal();
const apiKey = getApiKey();

if (!apiKey) {
  console.error("❌ No Etsy credentials found.");
  console.error("   Add to .env.local either:");
  console.error("   ETSY_API_KEY=keystring:shared_secret");
  console.error("   or:");
  console.error("   ETSY_KEYSTRING=...");
  console.error("   ETSY_SHARED_SECRET=...");
  process.exit(1);
}

const [keystring, ...rest] = apiKey.split(":");
const secret = rest.join(":");

console.log("✓ Etsy env loaded");
console.log(`  keystring: ${keystring.length} chars`);
console.log(`  shared secret: ${secret.length} chars`);

const res = await fetch(
  "https://api.etsy.com/v3/application/listings/active?keywords=timex&limit=1",
  {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  }
);

const body = await res.text();

if (res.ok) {
  console.log("✓ Etsy API connected — you're good to run npm run sync:etsy");
  process.exit(0);
}

console.error(`❌ Etsy API returned ${res.status}`);
console.error(`   ${body.slice(0, 200)}`);

if (res.status === 403) {
  console.error("\nCommon fixes:");
  console.error("  1. Etsy Developer Portal → Your Apps → open your app");
  console.error("  2. Copy BOTH the keystring AND shared secret (click Show on secret)");
  console.error("  3. Paste as ETSY_API_KEY=keystring:shared_secret in .env.local");
  console.error("  4. If app status is 'Pending Personal Approval', wait for Etsy email");
  console.error("     (403 is normal until approved — usually 1–7 days)");
}

process.exit(1);
