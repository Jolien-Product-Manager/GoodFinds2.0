import { NextResponse } from "next/server";
import { loadAllListings } from "@/lib/listings/load-all-listings";

export const dynamic = "force-dynamic";

/** Lightweight url → imageUrl index for purchased-watch photo backfill. */
export async function GET() {
  try {
    const { listings } = await loadAllListings();
    return NextResponse.json(
      listings.map((l) => ({
        url: l.url,
        imageUrl: l.imageUrl,
        title: l.title,
        description: l.description ?? null,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
