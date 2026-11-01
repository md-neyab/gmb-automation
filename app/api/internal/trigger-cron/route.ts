import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return handleTriggerCron(request);
}

export async function GET(request: Request) {
  return handleTriggerCron(request);
}

async function handleTriggerCron(request: Request) {
  // 1. Authenticate dashboard session
  const cookieHeader = request.headers.get("cookie") || "";
  const isDashboardUser = cookieHeader.includes("pinpilot_session");

  if (!isDashboardUser && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Unauthorized: Active dashboard session required" },
      { status: 401 },
    );
  }

  // 2. Parse target type ('post' | 'review')
  let targetType: string | null = null;
  const { searchParams } = new URL(request.url);
  targetType = searchParams.get("type");

  if (!targetType && request.method === "POST") {
    try {
      const body = (await request.json().catch(() => ({}))) as { type?: string };
      targetType = body?.type ?? null;
    } catch {
      // Ignore json parse error
    }
  }

  if (targetType !== "post" && targetType !== "review") {
    return NextResponse.json(
      { error: "Invalid target type. Expected 'post' or 'review'." },
      { status: 400 },
    );
  }

  // 3. Securely append CRON_SECRET_KEY from server environment
  const cronSecretKey = process.env.CRON_SECRET_KEY || process.env.CRON_SECRET || "";
  if (!cronSecretKey) {
    return NextResponse.json(
      { error: "CRON_SECRET_KEY is not configured on server." },
      { status: 500 },
    );
  }

  const endpointPath = targetType === "post" ? "/api/cron/auto-post" : "/api/cron/auto-reply";
  const cronUrl = new URL(endpointPath, request.url);

  try {
    const cronRes = await fetch(cronUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecretKey}`,
      },
      cache: "no-store",
    });

    const data = await cronRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: cronRes.status });
  } catch (error) {
    console.error(`Internal trigger proxy failed for ${targetType}:`, error);
    const msg = error instanceof Error ? error.message : "Internal trigger failure";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

