import { connection, NextResponse } from "next/server";
import { getAutomationSettings } from "@/lib/models";
import { generateMagicPostContent, MagicPostInputImage } from "@/lib/groq-ai";

const FALLBACK_KEYWORDS = [
  "SPC Flooring",
  "Wooden Flooring",
  "Herringbone Flooring",
  "Balcony Deck Tiles",
  "Laminate Flooring",
  "Engineered Hardwood",
];

const CURATED_UNSPLASH_FALLBACKS: MagicPostInputImage[] = [
  {
    id: "61TfyNIrWmI",
    url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=400&q=80",
    photographer: "Thanos Pal",
    altText: "Natural Oak Parquet Hardwood Living Room Floor",
  },
  {
    id: "1600585154340",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    photographer: "R ARCHITECTURE",
    altText: "Modern Living Space with Seamless Engineered Wooden Flooring",
  },
  {
    id: "1600566753376",
    url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=400&q=80",
    photographer: "R ARCHITECTURE",
    altText: "Contemporary Kitchen and Dining Area with Waterproof SPC Floors",
  },
  {
    id: "1618221195710",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80",
    photographer: "Spacejoy",
    altText: "Minimalist Scandinavian Interior with Warm Timber Flooring",
  },
  {
    id: "1616486338812",
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80",
    photographer: "Spacejoy",
    altText: "Warm Herringbone Patterned Wood Flooring",
  },
  {
    id: "1513694203232",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
    photographer: "NeONBRAND",
    altText: "Outdoor Balcony Interlocking Wood Deck Tiles",
  },
  {
    id: "1615873968413",
    url: "https://images.unsplash.com/photo-1615873968413-39e75f45d697?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1615873968413-39e75f45d697?auto=format&fit=crop&w=400&q=80",
    photographer: "Spacejoy",
    altText: "Luxury Vinyl Flooring in Modern Bedroom",
  },
  {
    id: "1586023492125",
    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80",
    photographer: "Kam-Idris",
    altText: "Architectural Interior with Dark Hardwood Flooring",
  },
  {
    id: "1600210492486",
    url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80",
    photographer: "R ARCHITECTURE",
    altText: "Premium Wide-Plank Oak Flooring in Open Living Room",
  },
  {
    id: "1600585154526",
    url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=400&q=80",
    photographer: "R ARCHITECTURE",
    altText: "Modern Terrace Deck Tiles and Balcony Flooring",
  },
];

async function fetchUnsplashImagesForKeyword(keyword: string): Promise<MagicPostInputImage[]> {
  const rawKey = process.env.UNSPLASH_API_KEY || process.env.UNSPLASH_ACCESS_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    return CURATED_UNSPLASH_FALLBACKS;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      keyword + " interior architecture flooring",
    )}&per_page=10&orientation=landscape`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`Unsplash API error in generate-magic HTTP ${res.status}`);
      return CURATED_UNSPLASH_FALLBACKS;
    }

    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        alt_description?: string;
        description?: string;
        user?: { name?: string };
        urls?: {
          small?: string;
          regular?: string;
          full?: string;
        };
      }>;
    };

    const photos: MagicPostInputImage[] = (data.results || []).map((p) => ({
      id: p.id,
      url: p.urls?.regular || p.urls?.full || p.urls?.small || "",
      thumbnail: p.urls?.small || p.urls?.regular || "",
      photographer: p.user?.name || "Unsplash Creator",
      altText: p.alt_description || p.description || `${keyword} design`,
    }));

    return photos.length > 0 ? photos : CURATED_UNSPLASH_FALLBACKS;
  } catch (err) {
    console.error("fetchUnsplashImagesForKeyword error:", err);
    return CURATED_UNSPLASH_FALLBACKS;
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      keyword?: string;
      type?: "STANDARD" | "OFFER" | "EVENT";
    };

    // 1. Pick keyword
    let chosenKeyword = body.keyword?.trim();
    if (!chosenKeyword) {
      const settings = await getAutomationSettings().catch(() => null);
      const pool =
        settings?.seoKeywords && settings.seoKeywords.length > 0
          ? settings.seoKeywords
          : FALLBACK_KEYWORDS;
      chosenKeyword = pool[Math.floor(Math.random() * pool.length)];
    }

    // 2. Fetch top 10 Unsplash images for this keyword
    const unsplashPhotos = await fetchUnsplashImagesForKeyword(chosenKeyword);

    // 3. Call Groq with both prompt & 10 Unsplash images
    const magicResult = await generateMagicPostContent(
      chosenKeyword,
      unsplashPhotos,
      body.type || "STANDARD",
    );

    return NextResponse.json({
      ok: true,
      text: magicResult.text,
      body: magicResult.body,
      title: magicResult.title,
      selectedImageUrl: magicResult.selectedImageUrl,
      selectedImage: magicResult.selectedImage,
      cta: magicResult.cta,
      hashtags: magicResult.hashtags,
      keyword: chosenKeyword,
      photos: unsplashPhotos,
    });
  } catch (error) {
    console.error("Generate Magic Post error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate autonomous magic post",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
