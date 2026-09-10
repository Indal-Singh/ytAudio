/**
 * Binary paths from environment (server-side only).
 *
 * YTDLP_PATH  — full path or command name for yt-dlp (e.g. /snap/bin/yt-dlp)
 * FFMPEG_PATH — full path or command name for ffmpeg (e.g. /usr/bin/ffmpeg)
 */
export function getYtDlpBin(): string {
  const fromEnv =
    process.env.YTDLP_PATH?.trim() ||
    process.env.YT_DLP_PATH?.trim() ||
    process.env.YTDLP_BIN?.trim();
  return fromEnv || "yt-dlp";
}

export function getFfmpegBin(): string {
  const fromEnv =
    process.env.FFMPEG_PATH?.trim() ||
    process.env.FFMPEG_BIN?.trim();
  return fromEnv || "ffmpeg";
}

/** App listen port (also used by npm scripts / Docker). */
export function getAppPort(): number {
  const raw = process.env.PORT?.trim();
  const n = raw ? parseInt(raw, 10) : 3000;
  return Number.isFinite(n) && n > 0 ? n : 3000;
}
