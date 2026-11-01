import { connection, NextResponse } from "next/server";
import { generateReviewReply, DEFAULT_BUSINESS_NAME } from "@/lib/groq-ai";
import { getAutomationSettings } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";
import { ReviewLog } from "@/lib/models/ReviewLog";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      reviews?: Array<{
        reviewId: string;
        reviewerName: string;
        starRating: number;
        comment?: string;
      }>;
    };

    const reviewItems = body.reviews;
    if (!Array.isArray(reviewItems) || reviewItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "An array of unreplied reviews is required." },
        { status: 400 },
      );
    }

    const settings = await getAutomationSettings();
    const db = await connectToDatabase();

    const drafts = await Promise.all(
      reviewItems.map(async (item, idx) => {
        // Pick an SEO keyword from MongoDB keywords
        const randomKw =
          item.starRating >= 4 && settings.seoKeywords?.length
            ? settings.seoKeywords[idx % settings.seoKeywords.length]
            : undefined;

        const replyResult = await generateReviewReply({
          reviewerName: item.reviewerName,
          starRating: item.starRating,
          comment: item.comment,
          businessName: DEFAULT_BUSINESS_NAME,
          tone: settings.replyTone,
          injectKeyword: randomKw,
        });

        // Save draft to MongoDB ReviewLog
        if (db) {
          try {
            await ReviewLog.findOneAndUpdate(
              { reviewId: item.reviewId },
              {
                $set: {
                  reviewerName: item.reviewerName,
                  starRating: item.starRating,
                  customerComment: item.comment || "",
                  aiReplyText: replyResult.reply,
                  status: "drafted",
                  publishedToGmb: false,
                  seoKeywordsUsed: replyResult.keywords || [],
                },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true },
            );
          } catch (dbErr) {
            console.warn(`Could not save draft log for ${item.reviewId}:`, dbErr);
          }
        }

        return {
          reviewId: item.reviewId,
          reviewerName: item.reviewerName,
          starRating: item.starRating,
          comment: item.comment || "",
          generatedReply: replyResult.reply,
          keywordsUsed: replyResult.keywords || [],
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      drafts,
      total: drafts.length,
    });
  } catch (error) {
    console.error("Batch generate failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate batch replies",
      },
      { status: 500 },
    );
  }
}
