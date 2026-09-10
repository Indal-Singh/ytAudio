import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface VideoItem {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  duration_string: string;
  view_count?: number;
  thumbnail: string;
  url: string;
}

export interface AudioStreamDetails {
  id: string;
  title: string;
  uploader: string;
  channel: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  audioUrl: string;
  format: string;
  ext: string;
  acodec: string;
}

// In-memory cache to make repeated queries instantaneous
const cache = new Map<string, { data: unknown; timestamp: number }>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

/** Drop a cache entry (e.g. expired googlevideo URL). */
export function invalidateCache(key: string) {
  cache.delete(key);
  inflight.delete(key);
}

/**
 * Return cached value, share an in-flight promise, or run `fn` once.
 * Prevents stampede when stream + proxy (or parallel cards) hit the same key.
 */
async function withCacheInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn()
    .then((data) => {
      setCache(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function extractVideoId(input: string): string {
  const trimmed = input.trim();
  // Standard 11 char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("?")[0] || trimmed;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
        return pathParts[1] || trimmed;
      }
    }
  } catch {
    // If not a URL, return as is
  }
  return trimmed;
}

export async function searchVideos(query: string, limit = 16, startIndex = 1): Promise<VideoItem[]> {
  const safeStart = Math.max(1, startIndex);
  const safeLimit = Math.max(1, Math.min(limit, 30));
  const safeEnd = safeStart + safeLimit - 1;
  // Don't over-fetch: related/small pages shouldn't force ytsearch50
  const maxSearchCount = Math.min(50, Math.max(safeEnd + 8, safeLimit + 10));

  const cacheKey = `search:${query}:${safeStart}:${safeLimit}`;

  return withCacheInflight(cacheKey, async () => {
    const searchQuery = `ytsearch${maxSearchCount}:${query}`;
    const args = [
      "--flat-playlist",
      "--dump-json",
      "--default-search",
      "ytsearch",
      "--playlist-items",
      `${safeStart}:${safeEnd}`,
      searchQuery,
    ];

    try {
      const { stdout } = await execFileAsync("yt-dlp", args, {
        maxBuffer: 25 * 1024 * 1024,
        timeout: 20000,
      });

      const lines = stdout.trim().split("\n").filter((l) => l.trim().length > 0);
      const results: VideoItem[] = [];

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (!item.id || !item.title) continue;

          let thumbnail = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
          if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
            thumbnail = item.thumbnails[item.thumbnails.length - 1].url || thumbnail;
          }

          results.push({
            id: item.id,
            title: item.title,
            uploader: item.uploader || item.channel || "Unknown Artist",
            duration: typeof item.duration === "number" ? item.duration : 0,
            duration_string: item.duration_string || formatDuration(item.duration),
            view_count: typeof item.view_count === "number" ? item.view_count : undefined,
            thumbnail,
            url: `https://www.youtube.com/watch?v=${item.id}`,
          });
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results;
    } catch (error) {
      console.error("Error searching yt-dlp:", error);
      throw new Error("Failed to search YouTube videos.");
    }
  });
}

export async function getAudioStreamDetails(videoIdOrUrl: string): Promise<AudioStreamDetails> {
  const videoId = extractVideoId(videoIdOrUrl);
  const cacheKey = `audio:${videoId}`;

  return withCacheInflight(cacheKey, async () => {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--extractor-args",
      "youtube:player_client=android,web",
      "-f",
      "ba/b",
      "-j",
      "--no-playlist",
      targetUrl,
    ];

    try {
      const { stdout } = await execFileAsync("yt-dlp", args, {
        maxBuffer: 30 * 1024 * 1024,
        timeout: 25000,
      });

      const data = JSON.parse(stdout.trim());
      if (!data.url) {
        throw new Error("Could not extract audio stream URL.");
      }

      return {
        id: data.id || videoId,
        title: data.title || "Unknown Title",
        uploader: data.uploader || data.channel || "Unknown Artist",
        channel: data.channel || data.uploader || "YouTube",
        duration: typeof data.duration === "number" ? data.duration : 0,
        duration_string: data.duration_string || formatDuration(data.duration),
        thumbnail:
          data.thumbnail ||
          (data.thumbnails?.length
            ? data.thumbnails[data.thumbnails.length - 1].url
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`),
        audioUrl: data.url,
        format: data.format || "audio only",
        ext: data.ext || "webm",
        acodec: data.acodec || "opus",
      } satisfies AudioStreamDetails;
    } catch (error) {
      console.error("Error extracting audio details:", error);
      throw new Error("Failed to extract audio stream.");
    }
  });
}

export interface VideoDirectLink {
  id: string;
  title: string;
  url: string;
  watchUrl: string;
  ext: string;
}

/** Resolve a direct progressive/video URL suitable for opening in a new tab. */
export async function getVideoDirectUrl(
  videoIdOrUrl: string,
  maxHeight = 720
): Promise<VideoDirectLink> {
  const videoId = extractVideoId(videoIdOrUrl);
  const height = Number.isFinite(maxHeight) ? maxHeight : 720;
  const cacheKey = `video:${videoId}:${height}`;

  return withCacheInflight(cacheKey, async () => {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const format =
      `best[height<=${height}][ext=mp4][protocol^=http]/` +
      `best[height<=${height}][ext=mp4]/` +
      `b[height<=${height}][ext=mp4]/` +
      `best[ext=mp4]/best`;

    const args = [
      "--no-update",
      "--extractor-args",
      "youtube:player_client=android,web",
      "-f",
      format,
      "-j",
      "--no-playlist",
      targetUrl,
    ];

    try {
      const { stdout } = await execFileAsync("yt-dlp", args, {
        maxBuffer: 30 * 1024 * 1024,
        timeout: 30000,
      });

      const data = JSON.parse(stdout.trim());
      const url = data.url || data.requested_formats?.[0]?.url;
      if (!url) {
        throw new Error("Could not extract video stream URL.");
      }

      return {
        id: data.id || videoId,
        title: data.title || "Unknown Title",
        url,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        ext: data.ext || "mp4",
      } satisfies VideoDirectLink;
    } catch (error) {
      console.error("Error extracting video URL:", error);
      throw new Error("Failed to extract video URL.");
    }
  });
}

function formatDuration(sec: number | undefined): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
