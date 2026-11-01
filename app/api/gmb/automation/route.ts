import { connection, NextResponse } from "next/server";
import {
  getAutomationSettings,
  saveAutomationSettings,
  AutomationSettings,
} from "@/lib/models";

export async function GET() {
  await connection();
  try {
    const settings = await getAutomationSettings();
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read automation settings." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    const body = (await request.json()) as Partial<AutomationSettings>;
    const updated = await saveAutomationSettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (error) {
    console.error("Save automation settings error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save automation settings." },
      { status: 500 },
    );
  }
}
