import { connection, NextResponse } from "next/server";
import { getOverviewData } from "@/lib/gmb-client";

export async function GET(request: Request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "30d";

    let days = 30;
    if (rangeParam === "7d" || rangeParam === "7D") days = 7;
    else if (rangeParam === "90d" || rangeParam === "90D") days = 90;

    const data = await getOverviewData(days);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("GMB Overview API failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        connected: false,
        accountName: "",
        locationName: "",
        profile: null,
        kpis: {
          totalImpressions: 0,
          searchImpressions: 0,
          mapsImpressions: 0,
          searchSharePct: 50,
          mapsSharePct: 50,
          totalActions: 0,
          callClicks: 0,
          websiteClicks: 0,
          directionRequests: 0,
          averageRating: 5.0,
          totalReviewCount: 0,
          unrepliedReviewsCount: 0,
          seoScore: 0,
          seoChecks: {
            hasTitle: false,
            hasPhone: false,
            hasWebsite: false,
            hasCategories: false,
            hasDescription: false,
            hasHours: false,
          },
        },
        dailySeries: [],
        searchKeywords: [],
        recentReviews: [],
        errors: [message],
      },
      { status: 200 }, // Return 200 so UI can display diagnostic alert without hard crash
    );
  }
}
