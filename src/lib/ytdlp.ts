import { execFile } from "child_process";
import { promisify } from "util";
import { getYtDlpBin } from "@/lib/binaries";

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
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const safeEnd = safeStart + safeLimit - 1;
  // Don't over-fetch: related/small pages shouldn't force ytsearch60
  const maxSearchCount = Math.min(60, Math.max(safeEnd + 8, safeLimit + 10));

  const cacheKey = `search:${query}:${safeStart}:${safeLimit}`;

  return withCacheInflight(cacheKey, async () => {
    const isUrl = /^(https?:\/\/|www\.)/i.test(query.trim());
    const searchQuery = isUrl ? query.trim() : `ytsearch${maxSearchCount}:${query}`;
    const args = [
      "--no-update",
      "--no-warnings",
      "--flat-playlist",
      "--dump-json",
      "--default-search",
      "ytsearch",
      "--playlist-items",
      `${safeStart}:${safeEnd}`,
      searchQuery,
    ];

    try {
      const { stdout } = await execFileAsync(getYtDlpBin(), args, {
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
      "--no-update",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=visionos,android",
      "-f",
      "ba/b",
      "-j",
      "--no-playlist",
      targetUrl,
    ];


    try {
      const { stdout } = await execFileAsync(getYtDlpBin(), args, {
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

/** Resolve a direct progressive/video URL for the requested resolution. */
export async function getVideoDirectUrl(
  videoIdOrUrl: string,
  maxHeight = 720
): Promise<VideoDirectLink> {
  const videoId = extractVideoId(videoIdOrUrl);
  const height = Number.isFinite(maxHeight) ? maxHeight : 720;
  const cacheKey = `video:${videoId}:${height}`;

  return withCacheInflight(cacheKey, async () => {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--no-update",
      "--no-warnings",
      "-J",
      "--no-playlist",
      targetUrl,
    ];

    try {
      const { stdout } = await execFileAsync(getYtDlpBin(), args, {
        maxBuffer: 30 * 1024 * 1024,
        timeout: 30000,
      });

      const data = JSON.parse(stdout.trim());
      const rawFormats = Array.isArray(data.formats) ? data.formats : [];

      // Find formats matching the target height or lower, with direct url
      // Prioritize formats matching exactly or <= height, with direct https url
      const candidates = rawFormats.filter(
        (f: { url?: string; height?: number; vcodec?: string; protocol?: string }) =>
          f.url &&
          typeof f.height === "number" &&
          f.height > 0 &&
          f.vcodec !== "none" &&
          (f.protocol === "https" || f.protocol === "http")
      );

      // Exact height match first
      let bestFormat = candidates.find((f: { height: number }) => f.height === height);

      // If not exact, find the highest resolution <= height
      if (!bestFormat) {
        const smaller = candidates
          .filter((f: { height: number }) => f.height <= height)
          .sort((a: { height: number }, b: { height: number }) => b.height - a.height);
        bestFormat = smaller[0];
      }

      // If still not found, find the closest available
      if (!bestFormat) {
        const sorted = [...candidates].sort(
          (a: { height: number }, b: { height: number }) =>
            Math.abs(a.height - height) - Math.abs(b.height - height)
        );
        bestFormat = sorted[0];
      }

      const url = bestFormat?.url || data.url;
      if (!url) {
        throw new Error(`Could not extract video stream URL for ${height}p.`);
      }

      return {
        id: data.id || videoId,
        title: data.title || "Unknown Title",
        url,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        ext: bestFormat?.ext || data.ext || "mp4",
      } satisfies VideoDirectLink;
    } catch (error) {
      console.error("Error extracting video URL:", error);
      throw new Error("Failed to extract video URL.");
    }
  });
}

export interface AvailableQuality {
  height: number;
  label: string;
  fps?: number;
  hasAudio: boolean;
  ext: string;
  filesizeApprox?: number;
}

/** Get list of actual available video qualities for a given video */
export async function getVideoFormats(videoIdOrUrl: string): Promise<{
  id: string;
  title: string;
  qualities: AvailableQuality[];
}> {
  const videoId = extractVideoId(videoIdOrUrl);
  const cacheKey = `formats:${videoId}`;

  return withCacheInflight(cacheKey, async () => {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--no-update",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=visionos,android",
      "-J",
      "--no-playlist",
      targetUrl,
    ];

    try {
      const { stdout } = await execFileAsync(getYtDlpBin(), args, {
        maxBuffer: 30 * 1024 * 1024,
        timeout: 30000,
      });

      const data = JSON.parse(stdout.trim());
      const rawFormats = Array.isArray(data.formats) ? data.formats : [];

      // Extract unique video heights
      const qualityMap = new Map<number, AvailableQuality>();

      for (const f of rawFormats) {
        if (!f.height || typeof f.height !== "number" || f.height < 144) continue;
        if (f.vcodec === "none" || !f.vcodec) continue;

        const h = f.height;
        const hasAudio = !!(f.acodec && f.acodec !== "none");
        const existing = qualityMap.get(h);

        // Quality label
        let label = `${h}p`;
        if (h >= 2160) label = "4K Ultra HD (2160p)";
        else if (h >= 1440) label = "2K Quad HD (1440p)";
        else if (h >= 1080) label = "1080p Full HD";
        else if (h >= 720) label = "720p HD";
        else if (h >= 480) label = "480p Standard";
        else if (h >= 360) label = "360p Data Saver";
        else if (h >= 240) label = "240p Low";
        else if (h >= 144) label = "144p Compact";

        if (f.fps && f.fps > 30 && (h === 720 || h === 1080 || h >= 1440)) {
          label += ` ${f.fps}fps`;
        }

        // Prefer formats that have audio or higher bitrate
        if (!existing || (!existing.hasAudio && hasAudio) || (f.filesize_approx && !existing.filesizeApprox)) {
          qualityMap.set(h, {
            height: h,
            label,
            fps: f.fps,
            hasAudio,
            ext: f.ext || "mp4",
            filesizeApprox: f.filesize_approx || f.filesize || undefined,
          });
        }
      }

      // Sort qualities descending (highest resolution first)
      const sortedQualities = Array.from(qualityMap.values()).sort(
        (a, b) => b.height - a.height
      );

      // Fallback standard qualities if none could be parsed
      if (sortedQualities.length === 0) {
        sortedQualities.push(
          { height: 1080, label: "1080p Full HD", hasAudio: true, ext: "mp4" },
          { height: 720, label: "720p HD", hasAudio: true, ext: "mp4" },
          { height: 480, label: "480p Standard", hasAudio: true, ext: "mp4" },
          { height: 360, label: "360p Data Saver", hasAudio: true, ext: "mp4" }
        );
      }

      return {
        id: data.id || videoId,
        title: data.title || "Unknown Video",
        qualities: sortedQualities,
      };
    } catch (error) {
      console.error("Error getting video formats:", error);
      // Fallback with standard options
      return {
        id: videoId,
        title: "Video",
        qualities: [
          { height: 1080, label: "1080p Full HD", hasAudio: true, ext: "mp4" },
          { height: 720, label: "720p HD", hasAudio: true, ext: "mp4" },
          { height: 480, label: "480p Standard", hasAudio: true, ext: "mp4" },
          { height: 360, label: "360p Data Saver", hasAudio: true, ext: "mp4" },
        ],
      };
    }
  });
}

function formatDuration(sec: number | undefined): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
