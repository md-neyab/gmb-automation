import { connection, NextResponse } from "next/server";
import { getBusinessProfile, getSearchKeywords } from "@/lib/gmb-client";
import { saveAutomationSettings, getAutomationSettings } from "@/lib/models";
import { DEFAULT_KEYWORDS, extractSEOKeywords } from "@/lib/groq-ai";

export async function POST() {
  await connection();

  try {
    // 1. Fetch real business profile and search queries from GMB
    const [profileResult, keywordsResult] = await Promise.allSettled([
      getBusinessProfile(),
      getSearchKeywords(),
    ]);

    const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
    const searchKeywords = keywordsResult.status === "fulfilled" ? keywordsResult.value : [];

    const businessTitle = profile?.title || "Goals Floors";
    const primaryCat = profile?.primaryCategory || "Wood and laminate flooring supplier";
    const addCats = profile?.additionalCategories || [];
    const topSearches = searchKeywords.map((k) => k.keyword).slice(0, 15).join(", ");

    // 2. Call Groq LLaMA 3 to extract 10-12 high-intent local SEO keywords
    let extractedKeywords = await extractSEOKeywords({
      title: businessTitle,
      category: primaryCat,
      categories: addCats,
      description: profile?.profile?.description || topSearches,
    });

    // 3. Fallback if Gemini unavailable or returned empty
    if (extractedKeywords.length === 0) {
      const topSearchKws = searchKeywords.map((k) => k.keyword.toLowerCase().trim()).filter(Boolean);
      const combined = Array.from(new Set([...topSearchKws, ...DEFAULT_KEYWORDS]));
      extractedKeywords = combined.slice(0, 12);
    }

    // 4. Save to MongoDB & local backup
    const updatedConfig = await saveAutomationSettings({
      seoKeywords: extractedKeywords,
      lastSyncedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      keywords: updatedConfig.seoKeywords,
      businessTitle,
      source: updatedConfig.source,
      count: updatedConfig.seoKeywords.length,
      lastSyncedAt: updatedConfig.lastSyncedAt,
    });
  } catch (error) {
    console.error("Keyword sync failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to sync keywords from GMB",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  await connection();
  const config = await getAutomationSettings();
  return NextResponse.json({
    ok: true,
    keywords: config.seoKeywords,
    lastSyncedAt: config.lastSyncedAt,
    source: config.source,
  });
}
