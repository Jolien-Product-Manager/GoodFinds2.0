import {
  EBAY_BRAND,
  EBAY_DEFAULT_QUERY,
  EBAY_PAGE_SIZE,
  EBAY_SEARCH_LIMIT,
  EBAY_WRISTWATCH_CATEGORY_ID,
  ebaySearchResponseSchema,
  type EbayItemSummary,
} from "./schema";

const REVALIDATE_SECONDS = 300;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getEbayConfig() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const marketplaceId = process.env.EBAY_MARKETPLACE_ID ?? "EBAY_CA";
  const env = process.env.EBAY_ENV ?? "production";

  if (!clientId || !clientSecret) {
    return null;
  }

  const baseUrl =
    env === "sandbox"
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

  return { clientId, clientSecret, marketplaceId, baseUrl };
}

async function getAccessToken(config: NonNullable<ReturnType<typeof getEbayConfig>>): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

async function fetchEbaySearchPage(
  config: NonNullable<ReturnType<typeof getEbayConfig>>,
  token: string,
  offset: number,
  limit: number
): Promise<EbayItemSummary[]> {
  const aspectFilter = `categoryId:${EBAY_WRISTWATCH_CATEGORY_ID},Brand:{${EBAY_BRAND}}`;
  const params = new URLSearchParams({
    q: EBAY_DEFAULT_QUERY,
    category_ids: EBAY_WRISTWATCH_CATEGORY_ID,
    aspect_filter: aspectFilter,
    limit: String(limit),
    offset: String(offset),
    sort: "newlyListed",
  });

  const res = await fetch(
    `${config.baseUrl}/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": config.marketplaceId,
        Accept: "application/json",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    }
  );

  if (!res.ok) {
    console.warn("eBay search failed:", res.status, "offset", offset);
    return [];
  }

  const json = await res.json();
  const parsed = ebaySearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("eBay response validation failed:", parsed.error.message);
    return [];
  }

  return parsed.data.itemSummaries ?? [];
}

export async function fetchEbayListings(): Promise<EbayItemSummary[]> {
  const config = getEbayConfig();
  if (!config) {
    return [];
  }

  try {
    const token = await getAccessToken(config);
    const results: EbayItemSummary[] = [];
    let offset = 0;

    while (results.length < EBAY_SEARCH_LIMIT) {
      const pageSize = Math.min(EBAY_PAGE_SIZE, EBAY_SEARCH_LIMIT - results.length);
      const page = await fetchEbaySearchPage(config, token, offset, pageSize);
      if (page.length === 0) break;
      results.push(...page);
      offset += page.length;
      if (page.length < pageSize) break;
    }

    return results;
  } catch (err) {
    console.warn("eBay fetch error:", err);
    return [];
  }
}

export function hasEbayCredentials(): boolean {
  const id = process.env.EBAY_CLIENT_ID?.trim();
  const secret = process.env.EBAY_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}
