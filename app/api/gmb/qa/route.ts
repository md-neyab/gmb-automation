import { connection, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PostActivityLog } from "@/lib/models/PostActivityLog";
import { generateQA } from "@/lib/groq-ai";

export async function GET() {
  await connection();

  try {
    const db = await connectToDatabase();
    if (!db) {
      // If MongoDB is unavailable, return empty list without auto-firing AI
      return NextResponse.json({
        ok: true,
        drafts: [],
        seeded: [],
      });
    }

    // 1. Fetch existing drafts
    const drafts = await PostActivityLog.find({ type: "QA", status: "draft" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // 2. Fetch already seeded Q&As
    const seeded = await PostActivityLog.find({ type: "QA", status: "live" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      ok: true,
      drafts: drafts.map((d) => ({
        id: String(d._id),
        question: d.summary,
        answer: d.answer || "",
        status: "draft",
      })),
      seeded: seeded.map((s) => ({
        id: String(s._id),
        question: s.summary,
        answer: s.answer || "",
        status: "live",
        publishedAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        googleUrl: s.googleUrl || "https://maps.google.com",
      })),
    });
  } catch (error) {
    console.error("Q&A queue GET error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load Q&A queue" },
      { status: 500 },
    );
  }
}

export async function POST() {
  await connection();

  try {
    const generated = await generateQA();
    const db = await connectToDatabase();
    const createdDocs = [];

    if (db) {
      // Clean up previous unseeded drafts if any, so user gets fresh 2 questions
      await PostActivityLog.deleteMany({ type: "QA", status: "draft" });

      for (const faq of generated) {
        const doc = await PostActivityLog.create({
          type: "QA",
          summary: faq.question,
          answer: faq.answer,
          status: "draft",
          isAiGenerated: true,
        });
        createdDocs.push({
          id: String(doc._id),
          question: doc.summary,
          answer: doc.answer || "",
          status: "draft",
        });
      }
    } else {
      for (let i = 0; i < generated.length; i++) {
        createdDocs.push({
          id: `mem-${Date.now()}-${i}`,
          question: generated[i].question,
          answer: generated[i].answer,
          status: "draft",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      drafts: createdDocs,
      message: "Generated 2 fresh Q&A drafts",
    });
  } catch (error) {
    console.error("Q&A generate POST error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate Q&A" },
      { status: 500 },
    );
  }
}
