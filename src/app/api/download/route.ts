import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import { Readable } from "stream";
import { getVideoDirectUrl, getVideoFormats } from "@/lib/ytdlp";
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
 * - type=formats → JSON { id, title, qualities } (all available video resolutions)
 * - type=video → MP4 stream download (or mode=open URL if requested)
 * - type=audio → MP3 stream via yt-dlp audio → ffmpeg (libmp3lame)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "audio";
  const quality = searchParams.get("quality") || "720";
  const bitrate = searchParams.get("bitrate") || "320";
  const titleHint = searchParams.get("title") || "";
  const mode = searchParams.get("mode") || "stream"; // "stream" | "open"

  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  const filename = sanitizeFilename(titleHint, `yt_${id}`);
  const targetUrl = `https://www.youtube.com/watch?v=${id}`;

  // ── 1. FORMATS: inspect and return actual available qualities ──
  if (type === "formats") {
    try {
      const data = await getVideoFormats(id);
      return NextResponse.json({
        success: true,
        id: data.id,
        title: data.title,
        qualities: data.qualities,
      });
    } catch (err: unknown) {
      console.error("Failed to query formats:", err);
      return NextResponse.json(
        { error: "Could not fetch formats", success: false },
        { status: 500 }
      );
    }
  }

  // ── 2. VIDEO PROGRESS (SSE): downloads & remuxes on server while streaming progress ──
  if (type === "video") {
    const action = searchParams.get("action") || "start";
    const height = parseInt(quality, 10) || 720;

    // Direct download file once ready
    if (action === "file") {
      const jobId = searchParams.get("jobId");
      if (!jobId || !/^[a-zA-Z0-9_-]+$/.test(jobId)) {
        return new Response("Invalid jobId", { status: 400 });
      }

      const os = await import("os");
      const path = await import("path");
      const fs = await import("fs");
      const tmpDir = path.join(os.tmpdir(), "yt_downloads");
      const filePath = path.join(tmpDir, `${jobId}.mp4`);

      if (!fs.existsSync(filePath)) {
        return new Response("File not found or expired", { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const nodeStream = fs.createReadStream(filePath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
      const safeFilename = encodeURIComponent(`${filename}_${height}p.mp4`);

      // Delete the file after it finishes streaming to keep disk clean
      nodeStream.on("close", () => {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(stat.size),
          "Content-Disposition": `attachment; filename="${filename}_${height}p.mp4"; filename*=UTF-8''${safeFilename}`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Default action="start": Start SSE stream that downloads & converts, reporting stages to frontend
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");
    const crypto = await import("crypto");

    const tmpDir = path.join(os.tmpdir(), "yt_downloads");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      } else {
        // Auto-cleanup sweep: delete any orphaned temp files older than 5 minutes
        const now = Date.now();
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          try {
            const fp = path.join(tmpDir, file);
            const stat = fs.statSync(fp);
            if (now - stat.mtimeMs > 5 * 60 * 1000) {
              fs.unlinkSync(fp);
            }
          } catch {}
        }
      }
    } catch {}

    const jobId = `${id}_${height}p_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const outputTemplate = path.join(tmpDir, `${jobId}.%(ext)s`);
    const finalMp4Path = path.join(tmpDir, `${jobId}.mp4`);

    const encoder = new TextEncoder();
    let ytdlpProcess: ChildProcess | null = null;

    const stream = new ReadableStream({
      start(controller) {
        function sendEvent(data: Record<string, unknown>) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {}
        }

        sendEvent({
          stage: "init",
          message: `Connecting to YouTube for ${height}p streams…`,
          progress: 0,
        });

        // Spawn yt-dlp to download video & audio and remux into MP4
        ytdlpProcess = spawn(
          getYtDlpBin(),
          [
            "--no-update",
            "--no-warnings",
            "--newline",
            "--extractor-args",
            "youtube:player_client=visionos,android",
            "-f",
            `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
            "--remux-video",
            "mp4",
            "-o",
            outputTemplate,
            "--no-playlist",
            targetUrl,
          ],
          { stdio: ["ignore", "pipe", "pipe"] }
        );

        let currentStage = "downloading";
        let subPhase = "video"; // 'video' | 'audio' | 'merging'
        let downloadCounter = 0;
        let lastStderr = "";

        ytdlpProcess.stdout?.on("data", (chunk: Buffer) => {
          const lines = chunk.toString().split(/[\r\n]+/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.includes("[download] Destination:")) {
              const lower = trimmed.toLowerCase();
              if (lower.includes(".f251.") || lower.includes(".f140.") || lower.includes("audio") || lower.includes(".m4a") || (downloadCounter > 0)) {
                subPhase = "audio";
                sendEvent({
                  stage: "downloading_audio",
                  message: "Downloading high-quality audio stream…",
                  progress: 50,
                });
              } else {
                subPhase = "video";
                sendEvent({
                  stage: "downloading",
                  message: `Downloading ${height}p video stream…`,
                  progress: 5,
                });
              }
              downloadCounter++;
            } else if (trimmed.includes("[download]") && trimmed.includes("%")) {
              // Example: [download]  45.0% of  16.78MiB at  3.50MiB/s ETA 00:03
              const pctMatch = trimmed.match(/(\d+(?:\.\d+)?)%/);
              const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
              const scaledProgress = subPhase === "video" ? Math.round(pct * 0.45) : Math.round(45 + pct * 0.45);

              sendEvent({
                stage: "downloading",
                message: subPhase === "video" 
                  ? `Downloading ${height}p video stream (${pct.toFixed(0)}%)…`
                  : `Downloading audio stream (${pct.toFixed(0)}%)…`,
                progress: scaledProgress,
                raw: trimmed,
              });
            } else if (trimmed.includes("[Merger]") || trimmed.includes("[VideoRemuxer]")) {
              currentStage = "converting";
              sendEvent({
                stage: "converting",
                message: `Muxing & converting audio + video into ${height}p MP4…`,
                progress: 92,
              });
            }
          }
        });

        // Capture stderr for troubleshooting
        ytdlpProcess.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString().trim();
          if (text) {
            lastStderr = text;
            if (text.toLowerCase().includes("error")) {
              console.error("yt-dlp stderr:", text);
            }
          }
        });

        ytdlpProcess.on("close", (code) => {
          if (code === 0 && fs.existsSync(finalMp4Path)) {
            const stat = fs.statSync(finalMp4Path);
            sendEvent({
              stage: "ready",
              message: `Ready! (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`,
              progress: 100,
              jobId,
              fileSize: stat.size,
              downloadUrl: `/api/download?type=video&action=file&id=${id}&jobId=${jobId}&quality=${height}&title=${encodeURIComponent(filename)}`,
            });
          } else {
            console.error("Video processing failed with code:", code, "lastStderr:", lastStderr);
            sendEvent({
              stage: "error",
              message: lastStderr || "Failed to download and convert video.",
            });
          }
          controller.close();
        });

        ytdlpProcess.on("error", (err) => {
          console.error("yt-dlp process error:", err);
          sendEvent({
            stage: "error",
            message: "Failed to start downloader process.",
          });
          controller.close();
        });
      },
      cancel() {
        killProcess(ytdlpProcess);
        // Clean up partial files
        try {
          const files = fs.readdirSync(tmpDir);
          for (const file of files) {
            if (file.startsWith(jobId)) {
              try { fs.unlinkSync(path.join(tmpDir, file)); } catch {}
            }
          }
        } catch {}
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ── 3. AUDIO: yt-dlp (bestaudio) → ffmpeg → MP3 stream ──
  const kbps = ["320", "256", "192", "128"].includes(bitrate) ? bitrate : "320";

  try {
    const ytdlp = spawn(
      getYtDlpBin(),
      [
        "--no-update",
        "--extractor-args",
        "youtube:player_client=visionos,android",
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
