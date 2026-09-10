import type { VideoItem } from "@/lib/ytdlp";

/** Noise words that mark alternate versions / packaging, not a new song. */
const VERSION_NOISE =
  /\b(official|audio|video|music\s*video|lyrics?|lyric\s*video|visualizer|hd|hq|4k|8k|uhd|mv|topic|slowed|reverb|sped\s*up|nightcore|karaoke|instrumental|cover|live|remix|mashup|bootleg|edit|extended|version|full\s*song|full\s*audio|original|clean|explicit|radio\s*edit|acoustic|unplugged|studio|performance|teaser|trailer|snippet|reaction|fanmade|audio\s*only|with\s*lyrics|no\s*copyright|ncs|ringtone)\b/gi;

const SEPARATORS = /\s*[-–—|:•·]\s*/g;

/**
 * Strip packaging / version fluff so "Song (Official Audio)" and
 * "Song - Slowed + Reverb" collapse to the same fingerprint.
 */
export function normalizeSongTitle(title: string, artist?: string): string {
  let t = (title || "").toLowerCase();

  // Drop bracketed segments: (Official Video), [Lyrics], {Remix}
  t = t.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, " ");

  // Common "Artist - Title" / "Title | Artist" shapes
  t = t.replace(SEPARATORS, " ");

  t = t.replace(VERSION_NOISE, " ");
  t = t.replace(/[^a-z0-9\s]/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  if (artist) {
    const a = artist
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (a) {
      // Remove artist name if it appears inside the title
      t = t.replace(new RegExp(`\\b${escapeRegExp(a)}\\b`, "g"), " ").trim();
      // Also remove individual artist tokens for "Artist Topic" style names
      for (const token of a.split(" ").filter((w) => w.length > 2 && w !== "topic")) {
        t = t.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"), " ");
      }
      t = t.replace(/\s+/g, " ").trim();
    }
  }

  return t;
}

/** Compact key used to treat alternate uploads as one song. */
export function songFingerprint(title: string, artist?: string): string {
  const normalized = normalizeSongTitle(title, artist);
  // Keep first 6 meaningful tokens — enough to identify the song core
  return normalized.split(" ").filter(Boolean).slice(0, 6).join(" ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenSet(s: string): Set<string> {
  return new Set(s.split(" ").filter((w) => w.length > 1));
}

/** Jaccard overlap of title tokens (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Lower = cleaner / more "main" release (prefer over slowed/cover/etc.). */
function versionPenalty(title: string): number {
  const lower = title.toLowerCase();
  let penalty = 0;
  if (/\b(slowed|reverb|sped\s*up|nightcore)\b/.test(lower)) penalty += 5;
  if (/\b(cover|karaoke|reaction|fanmade)\b/.test(lower)) penalty += 4;
  if (/\b(live|performance|unplugged)\b/.test(lower)) penalty += 3;
  if (/\b(remix|mashup|bootleg|edit)\b/.test(lower)) penalty += 2;
  if (/\b(lyrics?|lyric\s*video)\b/.test(lower)) penalty += 1;
  if (/\b(official\s*(audio|video|music\s*video)|topic)\b/.test(lower)) penalty -= 2;
  return penalty;
}

function pickBetterVersion(a: VideoItem, b: VideoItem): VideoItem {
  const pa = versionPenalty(a.title);
  const pb = versionPenalty(b.title);
  if (pa !== pb) return pa < pb ? a : b;
  const va = a.view_count ?? 0;
  const vb = b.view_count ?? 0;
  if (va !== vb) return va > vb ? a : b;
  // Prefer closer-to-song-length audio tracks over multi-hour mixes when possible
  const da = a.duration || 0;
  const db = b.duration || 0;
  const scoreDur = (d: number) => (d >= 90 && d <= 480 ? 1 : 0);
  if (scoreDur(da) !== scoreDur(db)) return scoreDur(da) > scoreDur(db) ? a : b;
  return a;
}

export interface RelatedFilterOptions {
  currentId: string;
  currentTitle: string;
  currentArtist?: string;
  limit: number;
  /** Drop if title similarity to current song is above this (default 0.55). */
  maxCurrentSimilarity?: number;
}

/**
 * Deduplicate alternate versions of the same song and drop near-clones
 * of the currently playing track.
 */
export function filterRelatedResults(
  results: VideoItem[],
  opts: RelatedFilterOptions
): VideoItem[] {
  const {
    currentId,
    currentTitle,
    currentArtist,
    limit,
    maxCurrentSimilarity = 0.55,
  } = opts;

  const currentFp = songFingerprint(currentTitle, currentArtist);
  const currentNorm = normalizeSongTitle(currentTitle, currentArtist);
  const bestByFingerprint = new Map<string, VideoItem>();

  for (const item of results) {
    if (!item?.id || item.id === currentId) continue;

    const fp = songFingerprint(item.title, item.uploader);
    if (!fp) continue;

    // Same song as what's playing (different upload / version)
    if (fp === currentFp) continue;
    if (titleSimilarity(normalizeSongTitle(item.title, item.uploader), currentNorm) >= maxCurrentSimilarity) {
      continue;
    }

    // Skip very short clips / hour+ mixes that aren't normal songs
    if (item.duration > 0 && (item.duration < 60 || item.duration > 15 * 60)) {
      continue;
    }

    const existing = bestByFingerprint.get(fp);
    if (!existing) {
      bestByFingerprint.set(fp, item);
    } else {
      bestByFingerprint.set(fp, pickBetterVersion(existing, item));
    }
  }

  return Array.from(bestByFingerprint.values()).slice(0, limit);
}

/**
 * Build search queries that find *other* tracks (same artist / vibe),
 * not more uploads of the current song.
 */
export function buildRelatedQueries(title: string, artist: string): string[] {
  const cleanArtist = (artist || "")
    .replace(/\s*[-–—]\s*topic\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const coreTitle = normalizeSongTitle(title, cleanArtist);
  const titleHint = coreTitle.split(" ").filter(Boolean).slice(0, 2).join(" ");

  const queries: string[] = [];

  if (cleanArtist && cleanArtist.toLowerCase() !== "unknown artist") {
    // Artist catalogue — avoids searching the same song title again
    queries.push(`${cleanArtist} songs`);
    queries.push(`${cleanArtist} hits`);
    if (titleHint) {
      // "like this" without quoting the exact title string heavily
      queries.push(`${cleanArtist} similar to ${titleHint}`);
    }
  } else if (titleHint) {
    queries.push(`${titleHint} similar songs`);
    queries.push(`${titleHint} playlist mix`);
  } else {
    queries.push("trending music songs");
  }

  // Unique, max 2 queries to keep latency reasonable
  return Array.from(new Set(queries)).slice(0, 2);
}

export interface HistorySeed {
  id?: string;
  title?: string;
  uploader?: string;
}

/**
 * Rank artists by how often they appear in recent listening history.
 */
export function pickTopArtists(seeds: HistorySeed[], max = 3): string[] {
  const counts = new Map<string, number>();

  for (const seed of seeds) {
    const raw = (seed.uploader || "").trim();
    if (!raw) continue;
    const cleaned = raw
      .replace(/\s*[-–—]\s*topic\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned || cleaned.toLowerCase() === "unknown artist") continue;
    const key = cleaned.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key]) => {
      // Restore original casing from first matching seed
      const match = seeds.find(
        (s) =>
          (s.uploader || "")
            .replace(/\s*[-–—]\s*topic\s*$/i, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase() === key
      );
      return (
        (match?.uploader || key)
          .replace(/\s*[-–—]\s*topic\s*$/i, "")
          .replace(/\s+/g, " ")
          .trim()
      );
    });
}

/**
 * Build search queries from listening history (artists + recent titles).
 */
export function buildHistoryRecommendQueries(seeds: HistorySeed[]): string[] {
  const artists = pickTopArtists(seeds, 3);
  const queries: string[] = [];

  for (const artist of artists) {
    queries.push(`${artist} songs`);
    queries.push(`${artist} hits`);
  }

  // Mix in one title-based vibe query from the most recent track
  const recent = seeds[0];
  if (recent?.title) {
    const hint = normalizeSongTitle(recent.title, recent.uploader)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
    if (hint && artists[0]) {
      queries.push(`${artists[0]} similar to ${hint}`);
    } else if (hint) {
      queries.push(`${hint} similar songs`);
    }
  }

  if (queries.length === 0) {
    queries.push("trending music songs");
  }

  // Cap to 3 searches for latency
  return Array.from(new Set(queries)).slice(0, 3);
}
