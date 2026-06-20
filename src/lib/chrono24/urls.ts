const CHRONO24_ORIGIN = "https://www.chrono24.com";
const CHRONO24_ID_RE = /--id(\d+)\.htm/i;

/** Extract the numeric listing id embedded in a Chrono24 detail URL. */
export function extractChrono24ListingId(url: string): string | null {
  const match = url.match(CHRONO24_ID_RE);
  return match?.[1] ?? null;
}

/**
 * Ensure a Chrono24 listing URL points at the correct article id.
 * Chrono24 detail pages always end with `--id{listingId}.htm`; the slug
 * before that can vary, but the id must match or the link opens the wrong watch.
 */
export function canonicalizeChrono24Url(
  listingId: string,
  url?: string | null
): string {
  const id = listingId.trim();
  if (!id) return CHRONO24_ORIGIN;

  if (url) {
    const absolute = url.startsWith("http")
      ? url
      : `${CHRONO24_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
    const urlId = extractChrono24ListingId(absolute);
    if (urlId === id) {
      return absolute.split("?")[0]!;
    }
  }

  return `${CHRONO24_ORIGIN}/timex/timex--id${id}.htm`;
}
