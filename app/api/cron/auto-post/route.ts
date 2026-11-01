import { NextResponse } from "next/server";
import { createLocalPost } from "@/lib/gmb-client";
import { generateLocalPost } from "@/lib/groq-ai";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")?.trim();
  const expectedKey = process.env.CRON_SECRET_KEY || process.env.CRON_SECRET || "";
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

  // Strict Secret Key Authentication for external triggers (e.g. cron-job.org)
  if (!authHeader || !token || !expectedKey || token !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    const payload = await generateLocalPost();
    const post = await createLocalPost(payload);

    return NextResponse.json({ ok: true, post, message: "Local post created successfully" });
  } catch (error) {
    console.error("Auto-post cron error:", error);
    const msg = error instanceof Error ? error.message : "Auto-post execution error";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      { status: 500 },
    );
  }
}
