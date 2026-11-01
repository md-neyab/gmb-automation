import { connection, NextResponse } from "next/server";
import { getBusinessProfile, getBusinessMedia } from "@/lib/gmb-client";

export async function GET() {
  await connection();

  try {
    const [liveProfile, logoUrl] = await Promise.all([
      getBusinessProfile().catch(() => null),
      getBusinessMedia().catch(() => undefined),
    ]);

    if (!liveProfile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Google Business Profile not connected or unavailable.",
          profile: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      source: "google_business_profile",
      profile: {
        businessName: liveProfile.title || "",
        logoUrl: logoUrl || "",
        primaryCategory: liveProfile.primaryCategory || "",
        additionalCategories: Array.isArray(liveProfile.additionalCategories)
          ? liveProfile.additionalCategories
          : [],
        phone: liveProfile.phoneNumbers?.primaryPhone || "",
        website: liveProfile.websiteUri || "",
        businessDescription: liveProfile.profile?.description || "",
        regularHours: liveProfile.regularHours || null,
        attributes: [],
      },
    });
  } catch (error) {
    console.error("GMB Profile API error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fetch profile",
        profile: null,
      },
      { status: 500 },
    );
  }
}
