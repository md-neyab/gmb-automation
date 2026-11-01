import { connection, NextResponse } from "next/server";
import { getAllReviews } from "@/lib/gmb-client";
import { getReviewConfig } from "@/lib/config";

export async function GET() {
  await connection();

  try {
    const summary = await getAllReviews();
    const config = getReviewConfig();

    const repliedCount = summary.reviews.filter((r) => !!r.replyText).length;
    const unrepliedCount = summary.reviews.filter((r) => !r.replyText).length;

    return NextResponse.json(
      {
        connected: true,
        reviews: summary.reviews,
        counts: {
          total: summary.totalReviewCount,
          replied: repliedCount,
          unreplied: unrepliedCount,
          averageRating: summary.averageRating,
          ratingDistribution: summary.ratingDistribution,
        },
        config,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch GMB reviews:", error);
    const msg = error instanceof Error ? error.message : "Failed to load reviews from Google Business Profile.";

    return NextResponse.json(
      {
        connected: false,
        reviews: [],
        counts: {
          total: 0,
          replied: 0,
          unreplied: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        config: getReviewConfig(),
        error: msg,
      },
      { status: 200 },
    );
  }
}
