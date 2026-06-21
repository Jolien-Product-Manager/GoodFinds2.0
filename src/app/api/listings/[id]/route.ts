import { NextResponse } from "next/server";
import type { Hunt } from "@/lib/hunts/types";
import { queryListingDetail } from "@/lib/listings/feed-query";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: { hunts?: Hunt[] };
  try {
    body = (await request.json()) as { hunts?: Hunt[] };
  } catch {
    body = {};
  }

  try {
    const detail = await queryListingDetail(id, body.hunts ?? []);
    if (!detail) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Listing lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
