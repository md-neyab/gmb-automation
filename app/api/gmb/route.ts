import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "connected",
    account: "Goals Floors",
    locations: ["Main Branch", "Gurgaon Studio"],
  });
}
