import { connection, NextResponse } from "next/server";
import { generateBusinessDescription } from "@/lib/groq-ai";

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      businessName?: string;
      primaryCategory?: string;
      additionalCategories?: string[];
      location?: string;
      keywords?: string[];
    };

    const description = await generateBusinessDescription({
      businessName: body.businessName,
      primaryCategory: body.primaryCategory,
      additionalCategories: body.additionalCategories,
      location: body.location,
      keywords: body.keywords,
    });

    return NextResponse.json({
      ok: true,
      description,
      charCount: description.length,
      maxLimit: 750,
    });
  } catch (error) {
    console.error("Groq description generation error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to generate business description",
      },
      { status: 500 },
    );
  }
}
