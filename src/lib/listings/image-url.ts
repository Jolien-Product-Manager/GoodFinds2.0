const CHRONO24_HOSTS = new Set([
  "img.chrono24.com",
  "cdn.chrono24.com",
  "cdn2.chrono24.com",
  "static.chrono24.com",
]);

export function isProxiedImageHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      CHRONO24_HOSTS.has(hostname) ||
      hostname.endsWith(".chrono24.com")
    );
  } catch {
    return false;
  }
}

/** Chrono24 CDN blocks browser hotlinking — load via our proxy instead. */
export function getListingImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  if (isProxiedImageHost(imageUrl)) {
    return `/api/listing-image?url=${encodeURIComponent(imageUrl)}`;
  }

  return imageUrl;
}

export function getListingImageSrcs(imageUrls: string[], max = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of imageUrls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const src = getListingImageSrc(url);
    if (src) result.push(src);
    if (result.length >= max) break;
  }
  return result;
}
