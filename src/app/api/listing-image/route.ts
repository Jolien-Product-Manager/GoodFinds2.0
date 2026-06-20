import { NextRequest, NextResponse } from "next/server";
import { isProxiedImageHost } from "@/lib/listings/image-url";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isProxiedImageHost(url)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.chrono24.com/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Image unavailable" },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
