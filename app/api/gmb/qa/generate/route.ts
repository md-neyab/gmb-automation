import { connection, NextResponse } from "next/server";
import { generateQA } from "@/lib/groq-ai";

export async function POST() {
  await connection();

  try {
    const faqs = await generateQA();
    return NextResponse.json({
      ok: true,
      faqs,
    });
  } catch (error) {
    console.error("Groq QA generation route error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate Q&A" },
      { status: 500 },
    );
  }
}
