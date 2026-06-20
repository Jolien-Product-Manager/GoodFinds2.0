import fs from "node:fs";
import path from "node:path";
import { chrono24SnapshotSchema, type Chrono24Listing } from "./schema";

const DATA_PATH = path.join(process.cwd(), "data/chrono24/vintage_timex.json");

/** Bundled seed listings used when the on-disk snapshot is missing or empty. */
const FALLBACK_LISTINGS: Chrono24Listing[] = [
  {
    listing_id: "38326337",
    title: "Timex Calendar Day Date Vintage",
    price_value: 28,
    price_currency: "USD",
    url: "https://www.chrono24.com/timex/timex-calendar-day-date-vintage--id38326337.htm",
    image_url: "https://picsum.photos/seed/timex-calendar-38326337/800/600",
    image_urls: ["https://picsum.photos/seed/timex-calendar-38326337/800/600"],
    year: 1970,
    is_vintage: true,
    source: "chrono24",
  },
  {
    listing_id: "36498802",
    title: "Timex Indiglo WR30M Two Tone Gold Day Date Vintage",
    price_value: 28,
    price_currency: "USD",
    url: "https://www.chrono24.com/timex/timex-indiglo-wr30m-two-tone-gold-stainless-steel-day-date-black-dial-gold-numbers-vintage--id36498802.htm",
    image_url: "https://picsum.photos/seed/timex-indiglo-36498802/800/600",
    image_urls: ["https://picsum.photos/seed/timex-indiglo-36498802/800/600"],
    year: 1975,
    is_vintage: true,
    source: "chrono24",
  },
  {
    listing_id: "30835323",
    title: "Timex Marlin Manual Wind Champagne Dial Vintage 1978",
    price_value: 28,
    price_currency: "USD",
    url: "https://www.chrono24.com/timex/timex-marlin-manual-wind-light-champagne-dial-vintage-1978--mens-watch33mm--id30835323.htm",
    image_url: "https://picsum.photos/seed/timex-marlin-30835323/800/600",
    image_urls: ["https://picsum.photos/seed/timex-marlin-30835323/800/600"],
    year: 1978,
    is_vintage: true,
    source: "chrono24",
  },
  {
    listing_id: "31434846",
    title: "Timex Marlin Date Circa 1974 Roman Numeral Dial",
    price_value: 28,
    price_currency: "USD",
    url: "https://www.chrono24.com/timex/timex-marlin-date-circa-1974-roman-numeral-dial-stainless-steel-mens-watch33mm--id31434846.htm",
    image_url: "https://picsum.photos/seed/timex-marlin-31434846/800/600",
    image_urls: ["https://picsum.photos/seed/timex-marlin-31434846/800/600"],
    year: 1974,
    is_vintage: true,
    source: "chrono24",
  },
];

function readListingsFromFile(): Chrono24Listing[] {
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
}

export function loadChrono24Listings(): Chrono24Listing[] {
  try {
    const listings = readListingsFromFile();
    if (listings.length > 0) {
      return listings;
    }

    console.warn(
      "Chrono24 snapshot is empty — using bundled seed listings. " +
        "Run the scraper with FlareSolverr for live Chrono24 data."
    );
    return FALLBACK_LISTINGS;
  } catch (err) {
    console.warn("Failed to load Chrono24 listings:", err);
    return FALLBACK_LISTINGS;
  }
}
