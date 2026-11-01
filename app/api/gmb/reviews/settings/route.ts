import { connection, NextResponse } from "next/server";
import { getReviewConfig, saveReviewConfig, PinPilotReviewConfig } from "@/lib/config";

export async function GET() {
  await connection();
  try {
    const config = getReviewConfig();
    return NextResponse.json({ ok: true, config });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read configuration." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    const body = (await request.json()) as Partial<PinPilotReviewConfig>;

    const updated = saveReviewConfig(body);
    return NextResponse.json({ ok: true, config: updated });
  } catch (error) {
    console.error("Save review settings failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save review configuration." },
      { status: 500 },
    );
  }
}
