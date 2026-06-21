import { NextRequest, NextResponse } from "next/server";
import { resolvePurchaseListingMetadata } from "@/lib/hunts/resolve-purchase-listing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const metadata = await resolvePurchaseListingMetadata(url);
    return NextResponse.json(metadata);
  } catch {
    return NextResponse.json({
      imageUrl: null,
      title: null,
      description: null,
    });
  }
}
