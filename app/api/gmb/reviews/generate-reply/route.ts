import { connection, NextResponse } from "next/server";
import {
  generateReviewReply,
  generateDeterministicReply,
  ReviewReplyInput,
} from "@/lib/groq-ai";
import { getAutomationSettings } from "@/lib/models";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as ReviewReplyInput;

    const starRating = Number(body.starRating) || 5;
    const reviewerName = body.reviewerName?.trim();
    const comment = body.comment?.trim();

    // Load centralized automation settings from MongoDB
    const settings = await getAutomationSettings();
    const tone = body.tone || settings.replyTone || (starRating <= 2 ? "apologetic" : "warm");

    // Automatically pick an SEO keyword from the business's saved MongoDB keywords
    const injectKeyword =
      body.injectKeyword?.trim() ||
      (starRating >= 4 && settings.seoKeywords?.length
        ? settings.seoKeywords[Math.floor(Math.random() * settings.seoKeywords.length)]
        : undefined);

    const result = await generateReviewReply({
      reviewerName,
      starRating,
      comment,
      tone,
      injectKeyword,
    });

    return NextResponse.json({
      ok: true,
      replyText: result.reply,
      keywords: result.keywords,
      tone: result.tone,
    });
  } catch (error) {
    console.error("AI Review Generation Error:", error);

    const fallback = generateDeterministicReply({
      starRating: 5,
      tone: "warm",
    });

    return NextResponse.json({
      ok: true,
      replyText: fallback.reply,
      keywords: fallback.keywords,
      tone: fallback.tone,
      fallbackUsed: true,
    });
  }
}
