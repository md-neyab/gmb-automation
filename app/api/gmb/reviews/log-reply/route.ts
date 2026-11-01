import { connection, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReviewLog } from "@/lib/models/ReviewLog";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      reviewId?: string;
      reviewerName?: string;
      starRating?: number;
      customerComment?: string;
      aiReplyText?: string;
      status?: "drafted" | "published";
      publishedToGmb?: boolean;
      seoKeywordsUsed?: string[];
      publishedAt?: string;
    };

    if (!body.reviewId || !body.aiReplyText) {
      return NextResponse.json(
        { ok: false, error: "reviewId and aiReplyText are required." },
        { status: 400 },
      );
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({
        ok: true,
        logged: false,
        message: "MongoDB unavailable, skipping log.",
      });
    }

    const updateDoc: Record<string, unknown> = {
      reviewerName: body.reviewerName || "Google Customer",
      starRating: Number(body.starRating) || 5,
      customerComment: body.customerComment || "",
      aiReplyText: body.aiReplyText,
      status: body.status || "published",
      publishedToGmb: body.publishedToGmb ?? (body.status === "published"),
      seoKeywordsUsed: body.seoKeywordsUsed || [],
    };

    if (body.publishedAt || body.publishedToGmb) {
      updateDoc.publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    }

    const log = await ReviewLog.findOneAndUpdate(
      { reviewId: body.reviewId },
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    console.error("Failed to log review reply:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to log review reply" },
      { status: 500 },
    );
  }
}
