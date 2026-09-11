import { NextRequest, NextResponse } from "next/server";
import { searchVideos, type VideoItem } from "@/lib/ytdlp";
import {
  buildRelatedQueries,
  filterRelatedResults,
} from "@/lib/related";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=180, stale-while-revalidate=420",
};

/**
 * GET /api/related?title=...&artist=...&currentId=...
 *
 * Returns similar / next-up songs — not alternate uploads of the same track.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  const currentId = searchParams.get("currentId") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 50);

  if (!title && !artist) {
    return NextResponse.json(
      { success: false, error: "title or artist is required" },
      { status: 400 }
    );
  }

  try {
    const queries = buildRelatedQueries(title, artist);
    const poolSize = Math.max(limit + 8, 14);

    // First query only — second only if we don't have enough unique songs
    const first = await searchVideos(queries[0], poolSize, 1);
    let merged: VideoItem[] = first;

    let filtered = filterRelatedResults(merged, {
      currentId,
      currentTitle: title,
      currentArtist: artist,
      limit,
    });

    if (filtered.length < limit && queries[1]) {
      const second = await searchVideos(queries[1], poolSize, 1);
      const seenIds = new Set(merged.map((v) => v.id));
      for (const item of second) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        merged.push(item);
      }
      filtered = filterRelatedResults(merged, {
        currentId,
        currentTitle: title,
        currentArtist: artist,
        limit,
      });
    }

    return NextResponse.json(
      { success: true, results: filtered },
      { headers: CACHE_HEADERS }
    );
  } catch (err) {
    console.error("Related songs fetch error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch related songs" },
      { status: 500 }
    );
  }
}
