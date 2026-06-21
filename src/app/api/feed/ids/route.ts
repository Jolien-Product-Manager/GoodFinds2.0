import { NextResponse } from "next/server";
import type { FeedQueryBody } from "@/lib/listings/feed-api";
import { queryFeedIds } from "@/lib/listings/feed-query";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: FeedQueryBody;
  try {
    body = (await request.json()) as FeedQueryBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body?.feedView || !body?.marketplaceFilter) {
    return NextResponse.json({ error: "Missing feed filters" }, { status: 400 });
  }

  body.selectedHuntIds = body.selectedHuntIds ?? [];
  body.selectedMatchQualities = body.selectedMatchQualities ?? [];

  try {
    const ids = await queryFeedIds(body);
    return NextResponse.json({ ids });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feed ids failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
