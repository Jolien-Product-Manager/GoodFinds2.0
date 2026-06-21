import { getCachedListings } from "@/lib/listings/listings-index";

export const dynamic = "force-dynamic";

/** Ping from Render cron every ~10 min to keep snapshots warm and prevent cold starts. */
export async function GET() {
  const started = Date.now();
  const { listings, sources } = await getCachedListings();
  return Response.json({
    ok: true,
    listings: listings.length,
    sources,
    ms: Date.now() - started,
  });
}
