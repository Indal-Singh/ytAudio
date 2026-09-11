import { existsSync } from "node:fs";

/**
 * Binary paths from environment (server-side only).
 *
 * YTDLP_PATH  — full path or command name for yt-dlp (e.g. yt-dlp)
 * FFMPEG_PATH — full path or command name for ffmpeg (e.g. ffmpeg)
 */
function resolveBinary(raw: string | undefined, defaultBin: string): string {
  const bin = raw?.trim();
  if (!bin) return defaultBin;

  // If running on Windows and given a Unix-like path or non-existent path
  if (process.platform === "win32") {
    if (bin.startsWith("/")) {
      console.warn(`[binaries] Unix path "${bin}" is not valid on Windows. Falling back to "${defaultBin}".`);
      return defaultBin;
    }
    if ((bin.includes("/") || bin.includes("\\")) && !existsSync(bin)) {
      console.warn(`[binaries] Path "${bin}" does not exist. Falling back to "${defaultBin}".`);
      return defaultBin;
    }
  }

  return bin;
}

export function getYtDlpBin(): string {
  const fromEnv =
    process.env.YTDLP_PATH?.trim() ||
    process.env.YT_DLP_PATH?.trim() ||
    process.env.YTDLP_BIN?.trim();
  return resolveBinary(fromEnv, "yt-dlp");
}

export function getFfmpegBin(): string {
  const fromEnv =
    process.env.FFMPEG_PATH?.trim() ||
    process.env.FFMPEG_BIN?.trim();
  return resolveBinary(fromEnv, "ffmpeg");
}

/** App listen port (also used by npm scripts / Docker). */
export function getAppPort(): number {
  const raw = process.env.PORT?.trim();
  const n = raw ? parseInt(raw, 10) : 3000;
  return Number.isFinite(n) && n > 0 ? n : 3000;
}

