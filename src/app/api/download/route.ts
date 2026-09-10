import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import { Readable } from "stream";
import { getVideoDirectUrl } from "@/lib/ytdlp";
import { getFfmpegBin, getYtDlpBin } from "@/lib/binaries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeFilename(raw: string, fallback: string) {
  const cleaned = raw.replace(/[^\w\s.-]/gi, "_").trim().slice(0, 80);
  return cleaned || fallback;
}

function killProcess(child: ChildProcess | null) {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore
  }
}

/**
 * GET /api/download
 * - type=video → JSON { url, watchUrl } for opening in a new tab
 * - type=audio → MP3 stream via yt-dlp audio → ffmpeg (libmp3lame)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "audio";
  const quality = searchParams.get("quality") || "720";
  const bitrate = searchParams.get("bitrate") || "320";
  const titleHint = searchParams.get("title") || "";

  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  const filename = sanitizeFilename(titleHint, `yt_${id}`);
  const targetUrl = `https://www.youtube.com/watch?v=${id}`;

  // ── VIDEO: resolve direct URL (client opens in new tab) ──
  if (type === "video") {
    try {
      const height = parseInt(quality, 10) || 720;
      const video = await getVideoDirectUrl(id, height);
      return NextResponse.json({
        success: true,
        mode: "open",
        url: video.url,
        watchUrl: video.watchUrl,
        title: titleHint || video.title,
        ext: video.ext,
      });
    } catch (err) {
      console.error("Video URL resolve error:", err);
      // Fallback: YouTube watch page always works in a new tab
      return NextResponse.json({
        success: true,
        mode: "open",
        url: `https://www.youtube.com/watch?v=${id}`,
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
        title: filename,
        ext: "html",
        fallback: true,
      });
    }
  }

  // ── AUDIO: yt-dlp (bestaudio) → ffmpeg → MP3 stream ──
  const kbps = ["320", "256", "192", "128"].includes(bitrate) ? bitrate : "320";

  try {
    const ytdlp = spawn(
      getYtDlpBin(),
      [
        "--no-update",
        "--extractor-args",
        "youtube:player_client=android,web",
        "-f",
        "ba/b",
        "-o",
        "-",
        "--no-playlist",
        "--no-warnings",
        targetUrl,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const ffmpeg = spawn(
      getFfmpegBin(),
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        `${kbps}k`,
        "-f",
        "mp3",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    // Pipe yt-dlp audio bytes into ffmpeg
    ytdlp.stdout.pipe(ffmpeg.stdin);

    // Prevent pipe backpressure / zombie processes
    ytdlp.stderr.on("data", () => {});
    ffmpeg.stderr.on("data", () => {});

    ytdlp.on("error", (err) => {
      console.error("yt-dlp spawn error:", err);
      killProcess(ffmpeg);
    });
    ffmpeg.on("error", (err) => {
      console.error("ffmpeg spawn error:", err);
      killProcess(ytdlp);
    });

    // If yt-dlp exits with error before ffmpeg finishes, abort ffmpeg
    ytdlp.on("close", (code) => {
      if (code && code !== 0) {
        try {
          ffmpeg.stdin.destroy();
        } catch {
          // Ignore
        }
        killProcess(ffmpeg);
      }
    });

    const onAbort = () => {
      killProcess(ytdlp);
      killProcess(ffmpeg);
    };
    request.signal.addEventListener("abort", onAbort);

    const cleanup = () => {
      request.signal.removeEventListener("abort", onAbort);
      killProcess(ytdlp);
      killProcess(ffmpeg);
    };
    ffmpeg.on("close", cleanup);

    if (!ffmpeg.stdout) {
      cleanup();
      return new Response("Failed to start audio conversion", { status: 500 });
    }

    const webStream = Readable.toWeb(ffmpeg.stdout) as ReadableStream<Uint8Array>;
    const safeFilename = encodeURIComponent(`${filename}.mp3`);

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}.mp3"; filename*=UTF-8''${safeFilename}`,
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
        "X-Audio-Bitrate": `${kbps}k`,
      },
    });
  } catch (err: unknown) {
    console.error("Audio download route error:", err);
    return new Response("Audio download failed. Please try again.", { status: 500 });
  }
}
