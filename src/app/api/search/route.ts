import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/ytdlp";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "trending music";
  const limit = parseInt(searchParams.get("limit") || "16", 10);
  const start = parseInt(searchParams.get("start") || "1", 10);

  try {
    const results = await searchVideos(
      q,
      isNaN(limit) ? 16 : limit,
      isNaN(start) ? 1 : start
    );
    return NextResponse.json(
      {
        success: true,
        query: q,
        start: isNaN(start) ? 1 : start,
        limit: isNaN(limit) ? 16 : limit,
        results,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
