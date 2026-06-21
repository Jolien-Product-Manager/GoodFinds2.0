import { NextResponse } from "next/server";
import { getCachedListings, findListingByUrl } from "@/lib/listings/listings-index";

export const dynamic = "force-dynamic";

/** Lightweight url → metadata lookup for purchased-watch photo backfill. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();

  if (url) {
    try {
      const { listings } = await getCachedListings();
      const listing = findListingByUrl(listings, url);
      if (!listing) {
        return NextResponse.json({
          url,
          imageUrl: null,
          title: null,
          description: null,
        });
      }
      return NextResponse.json({
        url: listing.url,
        imageUrl: listing.imageUrl,
        title: listing.title,
        description: listing.description ?? null,
      });
    } catch {
      return NextResponse.json({
        url,
        imageUrl: null,
        title: null,
        description: null,
      });
    }
  }

  try {
    const { listings } = await getCachedListings();
    return NextResponse.json(
      listings.map((listing) => ({
        url: listing.url,
        imageUrl: listing.imageUrl,
        title: listing.title,
        description: listing.description ?? null,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
