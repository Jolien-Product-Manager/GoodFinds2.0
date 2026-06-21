import { NextResponse } from "next/server";
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  type FeedQueryBody,
} from "@/lib/listings/feed-api";
import { queryFeedBootstrap } from "@/lib/listings/feed-query";

export const dynamic = "force-dynamic";

function parseLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return FEED_DEFAULT_LIMIT;
  }
  return Math.min(FEED_MAX_LIMIT, Math.max(1, Math.floor(value)));
}

function parseCursor(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

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
    const result = await queryFeedBootstrap({
      ...body,
      cursor: parseCursor(body.cursor),
      limit: parseLimit(body.limit),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feed bootstrap failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
