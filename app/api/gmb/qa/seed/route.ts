import { connection, NextResponse } from "next/server";
import { seedQuestionAndAnswer } from "@/lib/gmb-client";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      question?: string;
      answer?: string;
    };

    const question = body.question?.trim();
    const answer = body.answer?.trim();

    if (!question || !answer) {
      return NextResponse.json(
        { ok: false, error: "Both question and answer text are required." },
        { status: 400 },
      );
    }

    const result = await seedQuestionAndAnswer(question, answer);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to seed Q&A to Google Maps" },
        { status: 400 },
      );
    }

    // Log to MongoDB for History and Q&A tab
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { PostActivityLog } = await import("@/lib/models/PostActivityLog");
      await connectToDatabase();

      const draftId = (body as { draftId?: string }).draftId;
      if (draftId && draftId.length === 24) {
        await PostActivityLog.findByIdAndUpdate(draftId, {
          summary: question,
          answer,
          status: "live",
          googleUrl: "https://maps.google.com",
        });
      } else {
        await PostActivityLog.create({
          type: "QA",
          summary: question,
          answer,
          status: "live",
          googleUrl: "https://maps.google.com",
          isAiGenerated: true,
        });
      }
    } catch (logErr) {
      console.warn("Failed to write Q&A to PostActivityLog:", logErr);
    }

    return NextResponse.json({
      ok: true,
      questionName: result.questionName,
      message: "Successfully seeded customer question and owner answer to Google Maps!",
    });
  } catch (error) {
    console.error("GMB QA seed error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to seed Q&A" },
      { status: 500 },
    );
  }
}
