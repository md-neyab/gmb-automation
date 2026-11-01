import { connection, NextResponse } from "next/server";
import { replyToReview } from "@/lib/gmb-client";
import { connectToDatabase } from "@/lib/mongodb";
import { ReviewLog } from "@/lib/models/ReviewLog";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      reviewId?: string;
      replyText?: string;
      reviewerName?: string;
      starRating?: number;
      customerComment?: string;
    };

    const reviewId = body.reviewId?.trim();
    const replyText = body.replyText?.trim();

    if (!reviewId || !replyText) {
      return NextResponse.json(
        { ok: false, error: "Both reviewId and replyText are required to publish a reply." },
        { status: 400 },
      );
    }

    const result = await replyToReview(reviewId, replyText);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to publish reply to Google Business Profile." },
        { status: 400 },
      );
    }

    // Automatically update or upsert in MongoDB ReviewLog
    try {
      const db = await connectToDatabase();
      if (db) {
        await ReviewLog.findOneAndUpdate(
          { reviewId },
          {
            $set: {
              reviewerName: body.reviewerName || "Google Customer",
              starRating: Number(body.starRating) || 5,
              customerComment: body.customerComment || "",
              aiReplyText: replyText,
              status: "published",
              publishedToGmb: true,
              publishedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
      }
    } catch (logErr) {
      console.warn("Could not log published reply to MongoDB:", logErr);
    }

    return NextResponse.json({
      ok: true,
      reviewId: result.reviewId,
      reply: result.reply,
    });
  } catch (error) {
    console.error("Publish Review Reply failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to publish reply to Google.",
      },
      { status: 500 },
    );
  }
}
