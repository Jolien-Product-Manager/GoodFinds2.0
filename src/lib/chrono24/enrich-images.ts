import fs from "node:fs";
import path from "node:path";
import type { Chrono24Listing } from "./schema";

const DATA_PATH = path.join(process.cwd(), "data/chrono24/vintage_timex.json");
const PLACEHOLDER_RE = /picsum\.photos|sample-/i;
const CHRONO24_IMAGE_RE =
  /https:\/\/(?:img|cdn2)\.chrono24\.com\/images\/uhren\/[^'"\s<>]+\.(?:jpg|webp|jpeg)/gi;
const OG_IMAGE_RE = /property="og:image"\s+content="([^"]+)"/i;

export function needsChrono24ImageEnrichment(listing: Chrono24Listing): boolean {
  const imageUrl = listing.image_url ?? "";
  if (!imageUrl) return true;
  if (PLACEHOLDER_RE.test(imageUrl)) return true;
  return !imageUrl.includes("chrono24.com");
}

function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const og = html.match(OG_IMAGE_RE);
  if (og?.[1]) urls.push(og[1].replace(/&amp;/g, "&"));

  for (const match of html.matchAll(CHRONO24_IMAGE_RE)) {
    urls.push(match[0].replace(/&amp;/g, "&"));
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url.includes("chrono24.com") || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
    if (result.length >= 3) break;
  }
  return result;
}

async function fetchListingHtml(listingUrl: string): Promise<string | null> {
  const flareUrl = process.env.FLARESOLVERR_URL ?? "http://localhost:8191/v1";

  try {
    const res = await fetch(flareUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: listingUrl,
        maxTimeout: 60000,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      solution?: { response?: string };
    };
    if (data.status !== "ok" || !data.solution?.response) return null;
    return data.solution.response;
  } catch {
    return null;
  }
}

function readSnapshot(): { scraped_at?: string; listings: Chrono24Listing[] } | null {
  if (!fs.existsSync(DATA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function writeSnapshot(listings: Chrono24Listing[]): void {
  const existing = readSnapshot();
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(
      {
        scraped_at: new Date().toISOString(),
        query_count: existing?.listings ? undefined : 0,
        listing_count: listings.length,
        listings,
      },
      null,
      2
    )
  );
}

/** Replace placeholder/missing images with real Chrono24 CDN URLs when FlareSolverr is available. */
export async function enrichChrono24ListingsIfNeeded(
  listings: Chrono24Listing[]
): Promise<Chrono24Listing[]> {
  const needsWork = listings.filter(needsChrono24ImageEnrichment);
  if (needsWork.length === 0) return listings;

  if (!process.env.FLARESOLVERR_URL && !process.env.CHRONO24_ENRICH_IMAGES) {
    return listings;
  }

  let changed = false;
  const updated = [...listings];

  for (let i = 0; i < updated.length; i++) {
    const listing = updated[i];
    if (!needsChrono24ImageEnrichment(listing)) continue;

    const html = await fetchListingHtml(listing.url);
    if (!html) continue;

    const images = extractImagesFromHtml(html);
    if (images.length === 0) continue;

    updated[i] = {
      ...listing,
      image_url: images[0],
      image_urls: images,
    };
    changed = true;
    console.log(`Chrono24 images enriched for listing ${listing.listing_id}`);
  }

  if (changed) {
    writeSnapshot(updated);
  }

  return updated;
}
