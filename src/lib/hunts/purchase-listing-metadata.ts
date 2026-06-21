export interface PurchaseListingMetadata {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
}

export const EMPTY_PURCHASE_LISTING_METADATA: PurchaseListingMetadata = {
  imageUrl: null,
  title: null,
  description: null,
};

export function stripHtmlText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function mergePurchaseListingMetadata(
  current: Partial<PurchaseListingMetadata> | null | undefined,
  incoming: Partial<PurchaseListingMetadata> | null | undefined
): PurchaseListingMetadata {
  return {
    imageUrl: current?.imageUrl ?? incoming?.imageUrl ?? null,
    title: current?.title ?? incoming?.title ?? null,
    description: current?.description ?? incoming?.description ?? null,
  };
}
