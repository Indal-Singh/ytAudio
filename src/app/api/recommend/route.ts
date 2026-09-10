import { NextRequest, NextResponse } from "next/server";
import { searchVideos, type VideoItem } from "@/lib/ytdlp";
import {
  buildHistoryRecommendQueries,
  filterRelatedResults,
  songFingerprint,
  type HistorySeed,
} from "@/lib/related";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/recommend
 * Body: { seeds: [{ id, title, uploader }], limit?: number }
 *
 * Personalized recommendations from the user's listening history.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const seeds = (Array.isArray(body?.seeds) ? body.seeds : []) as HistorySeed[];
    const limit = Math.min(parseInt(String(body?.limit || "16"), 10) || 16, 24);

    if (seeds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Listening history seeds are required" },
        { status: 400 }
      );
    }

    const queries = buildHistoryRecommendQueries(seeds.slice(0, 20));
    const poolSize = Math.max(limit + 6, 12);

    // Run up to 3 artist/vibe searches in parallel
    const pools = await Promise.all(
      queries.map((q) => searchVideos(q, poolSize, 1).catch(() => [] as VideoItem[]))
    );

    const merged: VideoItem[] = [];
    const seenIds = new Set<string>();
    for (const pool of pools) {
      for (const item of pool) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        merged.push(item);
      }
    }

    // Exclude everything already in listening history (id + song fingerprint)
    const heardIds = new Set(
      seeds.map((s) => s.id).filter((id): id is string => Boolean(id))
    );
    const heardFingerprints = new Set(
      seeds
        .map((s) => songFingerprint(s.title || "", s.uploader))
        .filter(Boolean)
    );

    const withoutHeard = merged.filter((item) => {
      if (heardIds.has(item.id)) return false;
      const fp = songFingerprint(item.title, item.uploader);
      if (fp && heardFingerprints.has(fp)) return false;
      return true;
    });

    // Use most recent seed as "current" for near-duplicate filtering
    const seed = seeds[0] || {};
    const filtered = filterRelatedResults(withoutHeard, {
      currentId: seed.id || "",
      currentTitle: seed.title || "",
      currentArtist: seed.uploader || "",
      limit,
      maxCurrentSimilarity: 0.5,
    });

    // Extra pass: drop any remaining fingerprint collisions within results
    const unique: VideoItem[] = [];
    const fps = new Set<string>();
    for (const item of filtered) {
      const fp = songFingerprint(item.title, item.uploader);
      if (fp && fps.has(fp)) continue;
      if (fp) fps.add(fp);
      unique.push(item);
      if (unique.length >= limit) break;
    }

    return NextResponse.json({
      success: true,
      results: unique,
      basedOn: queries.slice(0, 3),
    });
  } catch (err) {
    console.error("Recommend API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to build recommendations" },
      { status: 500 }
    );
  }
}
