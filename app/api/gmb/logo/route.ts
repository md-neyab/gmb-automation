import { connection, NextResponse } from "next/server";
import { getBusinessMedia } from "@/lib/gmb-client";

export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url") || (await getBusinessMedia());

    if (!targetUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      },
    });
  } catch (error) {
    console.error("Logo proxy failed:", error);
    return new NextResponse(null, { status: 500 });
  }
}
