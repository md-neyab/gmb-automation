import { connection, NextResponse } from "next/server";

export type PexelsPhoto = {
  id: number | string;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  src: {
    medium: string;
    large: string;
    original: string;
    thumbnail: string;
  };
};

const FALLBACK_FLOORING_PHOTOS: PexelsPhoto[] = [
  {
    id: "6492398",
    alt: "Warm Herringbone Hardwood Living Room Flooring",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6492398/pexels-photo-6492398.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6492398/pexels-photo-6492398.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6492398/pexels-photo-6492398.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6492398/pexels-photo-6492398.jpeg",
    },
  },
  {
    id: "1571460",
    alt: "Modern Oak Wooden Flooring Interior",
    photographer: "Vecislavas Popa",
    src: {
      thumbnail: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
    },
  },
  {
    id: "1643383",
    alt: "Waterproof SPC Flooring in Contemporary Apartment",
    photographer: "Sidekix Media",
    src: {
      thumbnail: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg",
    },
  },
  {
    id: "2506990",
    alt: "Outdoor Balcony Wooden Deck Tiles",
    photographer: "Valeriia Miller",
    src: {
      thumbnail: "https://images.pexels.com/photos/2506990/pexels-photo-2506990.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/2506990/pexels-photo-2506990.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/2506990/pexels-photo-2506990.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/2506990/pexels-photo-2506990.jpeg",
    },
  },
  {
    id: "1457842",
    alt: "Luxury Laminate Flooring Bedroom",
    photographer: "Jean van der Meulen",
    src: {
      thumbnail: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg",
    },
  },
  {
    id: "276583",
    alt: "Natural Hardwood Parquet Flooring Hallway",
    photographer: "Pixabay",
    src: {
      thumbnail: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg",
    },
  },
  {
    id: "2724749",
    alt: "Minimalist Scandinavian Light Hardwood Flooring",
    photographer: "Pixabay",
    src: {
      thumbnail: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg",
    },
  },
  {
    id: "276528",
    alt: "Rustic Dark Hardwood Living Room",
    photographer: "Pixabay",
    src: {
      thumbnail: "https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg",
    },
  },
  {
    id: "2724748",
    alt: "Bright Oak Parquet Flooring Living Space",
    photographer: "Pixabay",
    src: {
      thumbnail: "https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg",
    },
  },
  {
    id: "1571468",
    alt: "Modern SPC Luxury Plank Flooring",
    photographer: "Vecislavas Popa",
    src: {
      thumbnail: "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg",
    },
  },
  {
    id: "6585757",
    alt: "Chevron Patterned Luxury Wooden Floor",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg",
    },
  },
  {
    id: "6585759",
    alt: "Wide Plank Engineered Wood Flooring",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6585759/pexels-photo-6585759.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6585759/pexels-photo-6585759.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6585759/pexels-photo-6585759.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6585759/pexels-photo-6585759.jpeg",
    },
  },
  {
    id: "6585750",
    alt: "Premium Balcony Teak Outdoor Deck Tiles",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg",
    },
  },
  {
    id: "6489734",
    alt: "Light Ash Hardwood Flooring Studio",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6489734/pexels-photo-6489734.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6489734/pexels-photo-6489734.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6489734/pexels-photo-6489734.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6489734/pexels-photo-6489734.jpeg",
    },
  },
  {
    id: "259962",
    alt: "Interior Natural Wood Floor Hallway",
    photographer: "Pixabay",
    src: {
      thumbnail: "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg",
    },
  },
  {
    id: "3932930",
    alt: "Minimalist Natural Wood Floor Studio Space",
    photographer: "Tatiana Syrikova",
    src: {
      thumbnail: "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/3932930/pexels-photo-3932930.jpeg",
    },
  },
  {
    id: "1571459",
    alt: "Luxury Dining Room Hardwood Flooring",
    photographer: "Vecislavas Popa",
    src: {
      thumbnail: "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg",
    },
  },
  {
    id: "6585614",
    alt: "Master Bedroom Herringbone Parquet Flooring",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6585614/pexels-photo-6585614.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6585614/pexels-photo-6585614.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6585614/pexels-photo-6585614.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6585614/pexels-photo-6585614.jpeg",
    },
  },
  {
    id: "1454806",
    alt: "Teak Outdoor Balcony Interlocking Decking Tiles",
    photographer: "Jean van der Meulen",
    src: {
      thumbnail: "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg",
    },
  },
  {
    id: "6492401",
    alt: "Modern Living Room Wood Paneling and Floor",
    photographer: "Max Rahubovskiy",
    src: {
      thumbnail: "https://images.pexels.com/photos/6492401/pexels-photo-6492401.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/6492401/pexels-photo-6492401.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/6492401/pexels-photo-6492401.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/6492401/pexels-photo-6492401.jpeg",
    },
  },
  {
    id: "1080721",
    alt: "Modern Open Kitchen Hardwood Floor",
    photographer: "vecislavas Popa",
    src: {
      thumbnail: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg",
    },
  },
  {
    id: "2082087",
    alt: "Luxury Penthouse Oak Wood Flooring",
    photographer: "Stephan Bechert",
    src: {
      thumbnail: "https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg",
    },
  },
  {
    id: "2635038",
    alt: "Elegant Warm Wood Plank Floor Interior",
    photographer: "Terje Sollie",
    src: {
      thumbnail: "https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg",
    },
  },
  {
    id: "1571470",
    alt: "Clean Minimalist Wooden Living Space",
    photographer: "Vecislavas Popa",
    src: {
      thumbnail: "https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg?auto=compress&cs=tinysrgb&w=300",
      medium: "https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg?auto=compress&cs=tinysrgb&w=800",
      large: "https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg?auto=compress&cs=tinysrgb&w=1200",
      original: "https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg",
    },
  },
];

function getPaginatedFallback(query: string, page: number, perPage: number) {
  const q = query.toLowerCase().trim();
  let filtered = FALLBACK_FLOORING_PHOTOS;

  if (q && q !== "wooden flooring" && q !== "all") {
    const matches = FALLBACK_FLOORING_PHOTOS.filter((p) =>
      p.alt.toLowerCase().includes(q),
    );
    if (matches.length > 0) {
      filtered = matches;
    }
  }

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const sliced = filtered.slice(start, end);

  // If page exceeds filtered length, wrap around or return remaining
  if (sliced.length === 0 && filtered.length > 0) {
    const wrapStart = (start % filtered.length);
    return filtered.slice(wrapStart, wrapStart + perPage);
  }

  return sliced;
}

export async function GET(request: Request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "wooden flooring").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(24, Math.max(1, parseInt(searchParams.get("per_page") || "6", 10)));

  const apiKey = process.env.PEXELS_API_KEY?.trim();

  // If no API key is provided, paginate through our curated 24-photo collection
  if (!apiKey) {
    const photos = getPaginatedFallback(query, page, perPage);
    return NextResponse.json({
      photos,
      total_results: FALLBACK_FLOORING_PHOTOS.length,
      page,
      per_page: perPage,
      source: "curated_fallback",
      query,
      has_more: page * perPage < FALLBACK_FLOORING_PHOTOS.length,
      message: "Showing curated high-res gallery. Add PEXELS_API_KEY to .env.local for unlimited live Pexels search.",
    });
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Pexels API error HTTP ${res.status}:`, errText);
      const fallback = getPaginatedFallback(query, page, perPage);
      return NextResponse.json({
        photos: fallback,
        total_results: FALLBACK_FLOORING_PHOTOS.length,
        page,
        per_page: perPage,
        source: "curated_fallback",
        query,
        error: `Pexels HTTP ${res.status}`,
      });
    }

    const data = (await res.json()) as {
      total_results?: number;
      photos?: Array<{
        id: number;
        alt?: string;
        photographer?: string;
        photographer_url?: string;
        src?: {
          tiny?: string;
          small?: string;
          medium?: string;
          large?: string;
          original?: string;
        };
      }>;
    };

    const photos: PexelsPhoto[] = (data.photos || []).map((p) => ({
      id: p.id,
      alt: p.alt || query,
      photographer: p.photographer || "Pexels Artist",
      photographerUrl: p.photographer_url,
      src: {
        thumbnail: p.src?.small || p.src?.tiny || p.src?.medium || "",
        medium: p.src?.medium || p.src?.large || "",
        large: p.src?.large || p.src?.original || "",
        original: p.src?.original || p.src?.large || "",
      },
    }));

    if (photos.length === 0) {
      const fallback = getPaginatedFallback(query, page, perPage);
      return NextResponse.json({
        photos: fallback,
        total_results: FALLBACK_FLOORING_PHOTOS.length,
        page,
        per_page: perPage,
        source: "curated_fallback",
        query,
      });
    }

    return NextResponse.json({
      photos,
      total_results: data.total_results || photos.length,
      page,
      per_page: perPage,
      source: "pexels_api",
      query,
    });
  } catch (error) {
    console.error("Pexels fetch failed:", error);
    const fallback = getPaginatedFallback(query, page, perPage);
    return NextResponse.json({
      photos: fallback,
      total_results: FALLBACK_FLOORING_PHOTOS.length,
      page,
      per_page: perPage,
      source: "curated_fallback",
      query,
      error: error instanceof Error ? error.message : "Network error",
    });
  }
}
