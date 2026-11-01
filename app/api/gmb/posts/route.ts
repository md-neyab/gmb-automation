import { connection, NextResponse } from "next/server";
import { getLocalPosts, createLocalPost, CreateLocalPostInput } from "@/lib/gmb-client";

export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const result = await getLocalPosts(pageSize);
    return NextResponse.json({
      ok: true,
      localPosts: result.localPosts,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error("Failed to fetch local posts:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch local posts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as CreateLocalPostInput;

    if (!body.summary && !body.body && !body.text) {
      return NextResponse.json(
        { ok: false, error: "Post summary text is required." },
        { status: 400 },
      );
    }

    const result = await createLocalPost(body);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to publish post to Google My Business" },
        { status: 400 },
      );
    }

    // Log to MongoDB for History tab
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { PostActivityLog } = await import("@/lib/models/PostActivityLog");
      await connectToDatabase();
      await PostActivityLog.create({
        type: "POST",
        title: body.title,
        summary: body.summary || body.body || body.text,
        topicType: body.topicType || "STANDARD",
        cta: body.cta || (body.callToAction?.actionType as string),
        mediaUrl: body.mediaUrl || body.media?.[0]?.sourceUrl,
        status: "live",
        googleUrl: result.post?.searchUrl || "https://maps.google.com",
      });
    } catch (logErr) {
      console.warn("Failed to write to PostActivityLog:", logErr);
    }

    return NextResponse.json({
      ok: true,
      post: result.post,
      message: "Post successfully published to Google Maps Knowledge Panel!",
    });
  } catch (error) {
    console.error("Failed to create local post:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to publish post" },
      { status: 500 },
    );
  }
}
