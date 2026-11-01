import { connection, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReviewLog } from "@/lib/models/ReviewLog";

export async function GET() {
  await connection();

  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ ok: true, logs: [], databaseConnected: false });
    }

    const logs = await ReviewLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formatted = logs.map((log) => ({
      _id: log._id.toString(),
      reviewId: log.reviewId,
      reviewerName: log.reviewerName,
      starRating: log.starRating,
      customerComment: log.customerComment || "",
      aiReplyText: log.aiReplyText,
      status: log.status,
      publishedToGmb: log.publishedToGmb,
      seoKeywordsUsed: log.seoKeywordsUsed || [],
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
      publishedAt: log.publishedAt ? new Date(log.publishedAt).toISOString() : undefined,
    }));

    return NextResponse.json(
      { ok: true, logs: formatted, databaseConnected: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to fetch review history:", error);
    return NextResponse.json(
      {
        ok: false,
        logs: [],
        error: error instanceof Error ? error.message : "Failed to fetch review history",
      },
      { status: 500 },
    );
  }
}
