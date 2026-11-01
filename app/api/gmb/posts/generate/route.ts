import { connection, NextResponse } from "next/server";
import { generatePostContent } from "@/lib/groq-ai";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      topic?: string;
      type?: "STANDARD" | "OFFER" | "EVENT";
    };

    const postContent = await generatePostContent(body.topic, body.type || "STANDARD");

    return NextResponse.json({
      ok: true,
      content: postContent,
    });
  } catch (error) {
    console.error("Groq post generation route error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate post copy" },
      { status: 500 },
    );
  }
}
