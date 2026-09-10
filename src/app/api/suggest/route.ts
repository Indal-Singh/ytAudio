import { NextRequest, NextResponse } from "next/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ suggestions: [] }, { headers: CACHE_HEADERS });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] }, { headers: CACHE_HEADERS });
    }

    const data = await res.json();
    // Firefox client format: [query, [suggestion1, suggestion2, ...]]
    const suggestions = Array.isArray(data[1]) ? data[1].slice(0, 8) : [];

    return NextResponse.json({ suggestions }, { headers: CACHE_HEADERS });
  } catch (err) {
    console.warn("Suggestions fetch error:", err);
    return NextResponse.json({ suggestions: [] }, { headers: CACHE_HEADERS });
  }
}
