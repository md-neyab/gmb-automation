import { connection, NextResponse } from "next/server";
import { saveRecentPhotos } from "@/lib/models/RecentPhoto";

export type UnsplashPhotoItem = {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  altText: string;
};

// Curated high-resolution Unsplash photos for flooring and interior architecture fallback
const FALLBACK_UNSPLASH_PHOTOS: UnsplashPhotoItem[] = [
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
  {
    id: "1618219908412",
    url: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=400&q=80",
    photographer: "Spacejoy",
    altText: "Bright Scandinavian Living Room with Wooden Floor",
  },
  {
    id: "1600607687939",
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80",
    photographer: "R ARCHITECTURE",
    altText: "Elegant Chevron Parquet Wooden Floors",
  },
];

export async function GET(request: Request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "wooden flooring").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(24, Math.max(1, parseInt(searchParams.get("per_page") || "12", 10)));

  const rawKey = process.env.UNSPLASH_API_KEY || process.env.UNSPLASH_ACCESS_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    const start = (page - 1) * perPage;
    const sliced = FALLBACK_UNSPLASH_PHOTOS.slice(start, start + perPage);
    return NextResponse.json({
      photos: sliced.length > 0 ? sliced : FALLBACK_UNSPLASH_PHOTOS.slice(0, perPage),
      source: "curated_fallback",
      query,
      page,
      total_results: FALLBACK_UNSPLASH_PHOTOS.length,
      has_more: (page * perPage) < FALLBACK_UNSPLASH_PHOTOS.length,
    });
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query,
    )}&page=${page}&per_page=${perPage}&orientation=landscape`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Unsplash API HTTP ${res.status}:`, errText);
      const start = (page - 1) * perPage;
      const sliced = FALLBACK_UNSPLASH_PHOTOS.slice(start, start + perPage);
      return NextResponse.json({
        photos: sliced.length > 0 ? sliced : FALLBACK_UNSPLASH_PHOTOS.slice(0, perPage),
        source: "curated_fallback",
        query,
        page,
        total_results: FALLBACK_UNSPLASH_PHOTOS.length,
        has_more: false,
        error: `Unsplash HTTP ${res.status}`,
      });
    }

    const data = (await res.json()) as {
      total?: number;
      total_pages?: number;
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

    const photos: UnsplashPhotoItem[] = (data.results || []).map((p) => ({
      id: p.id,
      url: p.urls?.regular || p.urls?.full || p.urls?.small || "",
      thumbnail: p.urls?.small || p.urls?.regular || "",
      photographer: p.user?.name || "Unsplash Creator",
      altText: p.alt_description || p.description || `${query} photography`,
    }));

    if (photos.length === 0) {
      return NextResponse.json({
        photos: FALLBACK_UNSPLASH_PHOTOS.slice(0, perPage),
        source: "curated_fallback",
        query,
        page,
        total_results: FALLBACK_UNSPLASH_PHOTOS.length,
        has_more: false,
      });
    }

    // Persist photos to MongoDB / memory cache (max 100 FIFO)
    saveRecentPhotos(photos, query).catch((err) =>
      console.warn("Background photo cache update warning:", err),
    );

    return NextResponse.json({
      photos,
      source: "unsplash_api",
      query,
      page,
      total_results: data.total || photos.length,
      has_more: page < (data.total_pages || 1),
    });
  } catch (error) {
    console.error("Unsplash fetch error:", error);
    return NextResponse.json({
      photos: FALLBACK_UNSPLASH_PHOTOS.slice(0, perPage),
      source: "curated_fallback",
      query,
      page,
      error: error instanceof Error ? error.message : "Network error",
    });
  }
}
