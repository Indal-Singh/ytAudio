import { NextRequest, NextResponse } from "next/server";

export interface SponsorSegmentItem {
  category: string;
  actionType: string;
  segment: [number, number];
  UUID: string;
  videoDuration?: number;
}

// In-memory cache for 1 hour
interface CacheEntry {
  segments: SponsorSegmentItem[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CATEGORIES = [
  "sponsor",
  "intro",
  "outro",
  "music_offtopic",
  "selfpromo",
  "interaction",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(id);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ segments: cached.segments, source: "cache" });
  }

  try {
    const categoriesParam = encodeURIComponent(JSON.stringify(CATEGORIES));
    const apiUrl = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
      id
    )}&categories=${categoriesParam}`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "YTaudio/2.2.0 (web-app)",
      },
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      // No segments exist for this video — this is expected for many videos
      const empty: SponsorSegmentItem[] = [];
      cache.set(id, { segments: empty, timestamp: now });
      return NextResponse.json({ segments: empty });
    }

    if (!res.ok) {
      // Non-200 non-404 status
      return NextResponse.json({ segments: [] });
    }

    const data = (await res.json()) as SponsorSegmentItem[];
    const normalized: SponsorSegmentItem[] = Array.isArray(data)
      ? data.map((item) => ({
          category: item.category,
          actionType: item.actionType || "skip",
          segment: [
            Math.round(item.segment[0] * 10) / 10,
            Math.round(item.segment[1] * 10) / 10,
          ],
          UUID: item.UUID,
          videoDuration: item.videoDuration,
        }))
      : [];

    cache.set(id, { segments: normalized, timestamp: now });

    // Clean up cache if map exceeds 500 items
    if (cache.size > 500) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    return NextResponse.json({ segments: normalized });
  } catch (err) {
    console.warn("SponsorBlock fetch error:", err);
    return NextResponse.json({ segments: [] });
  }
}
