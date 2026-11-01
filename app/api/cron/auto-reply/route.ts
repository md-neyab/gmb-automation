import { NextResponse } from "next/server";
import { getReviews, replyToReview } from "@/lib/gmb-client";
import { generateReviewReply, DEFAULT_BUSINESS_NAME } from "@/lib/groq-ai";
import { getReviewConfig } from "@/lib/config";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedKey = process.env.CRON_SECRET_KEY || process.env.CRON_SECRET || "";
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

  // Strict Secret Key Authentication for external triggers (e.g. cron-job.org)
  if (!authHeader || !token || !expectedKey || token !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    const config = getReviewConfig();
    if (!config.autoReplyEnabled) {
      return NextResponse.json({
        ok: true,
        status: "skipped",
        message: "AI auto-reply is currently disabled in PinPilot settings.",
        processed: 0,
      });
    }

    const reviews = await getReviews();
    const pendingReplies = reviews.filter(
      (review) => !review.replyText && review.starRating >= (config.minStarThreshold ?? 4),
    );

    const results = await Promise.all(
      pendingReplies.map(async (review) => {
        // Pick a random keyword from configured SEO keywords for positive reviews
        const randomKw =
          review.starRating >= 4 && config.seoKeywords?.length
            ? config.seoKeywords[Math.floor(Math.random() * config.seoKeywords.length)]
            : undefined;

        const payload = await generateReviewReply({
          reviewerName: review.reviewer,
          starRating: review.starRating,
          comment: review.comment,
          businessName: DEFAULT_BUSINESS_NAME,
          tone: config.defaultTone,
          injectKeyword: randomKw,
        });

        const replyRes = await replyToReview(review.reviewId, payload.reply);

        return {
          reviewId: review.reviewId,
          reviewer: review.reviewer,
          starRating: review.starRating,
          ok: replyRes.ok,
          error: replyRes.error,
          reply: payload.reply,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      minStarThreshold: config.minStarThreshold,
      results,
    });
  } catch (error) {
    console.error("Auto-reply cron error:", error);
    const msg = error instanceof Error ? error.message : "Auto-reply cron execution failure";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      { status: 500 },
    );
  }
}
