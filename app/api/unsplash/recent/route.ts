import { connection, NextResponse } from "next/server";
import { getRecentPhotos } from "@/lib/models/RecentPhoto";

export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const recent = await getRecentPhotos(limit);

    return NextResponse.json({
      ok: true,
      photos: recent,
      total: recent.length,
    });
  } catch (error) {
    console.error("Failed to fetch recent photos:", error);
    return NextResponse.json({
      ok: false,
      photos: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
