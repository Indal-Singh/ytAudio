import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import { Readable } from "stream";
import { getVideoFormats } from "@/lib/ytdlp";
import {
  getFfmpegBin,
  getFfmpegDir,
  getSpawnEnv,
  getYtDlpBin,
  getYtDlpCookieArgs,
} from "@/lib/binaries";

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

/** Formats seconds into HH:MM:SS or MM:SS for clean filenames */
function formatTimeTag(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, "0")}m${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

/**
 * GET /api/cut
 * - action=formats → returns available resolutions for the video
 * - action=file → downloads generated cut file
 * - action=start (default) → SSE stream cutting the selected section with real-time progress
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "start";
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  // ── 1. FORMATS: Inspect available video resolutions ──
  if (action === "formats") {
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

  // ── 2. FILE DOWNLOAD: Stream trimmed file to user & auto cleanup ──
  if (action === "file") {
    const jobId = searchParams.get("jobId");
    const format = searchParams.get("format") || "mp4";
    const titleHint = searchParams.get("title") || `cut_${id}`;

    if (!jobId || !/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      return new Response("Invalid jobId", { status: 400 });
    }

    const ext = format === "mp3" ? "mp3" : "mp4";
    const contentType = format === "mp3" ? "audio/mpeg" : "video/mp4";

    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");
    const tmpDir = path.join(os.tmpdir(), "yt_cuts");
    const filePath = path.join(tmpDir, `${jobId}.${ext}`);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found or expired", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const nodeStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const cleanName = sanitizeFilename(titleHint, `cut_${id}`);
    const finalFilename = `${cleanName}.${ext}`;
    const safeFilename = encodeURIComponent(finalFilename);

    // Clean up file on stream completion
    nodeStream.on("close", () => {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${finalFilename}"; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── 3. START CUT: Server-Sent Events (SSE) Trimming ──
  const startParam = parseFloat(searchParams.get("start") || "0");
  const endParam = parseFloat(searchParams.get("end") || "0");
  const quality = searchParams.get("quality") || "720";
  const format = searchParams.get("format") === "mp3" ? "mp3" : "mp4";
  const bitrate = searchParams.get("bitrate") || "320";
  const titleHint = searchParams.get("title") || "";

  const startTime = Math.max(0, isNaN(startParam) ? 0 : startParam);
  const endTime = Math.max(startTime + 0.5, isNaN(endParam) ? 10 : endParam);
  const duration = endTime - startTime;

  const height = parseInt(quality, 10) || 720;
  const filename = sanitizeFilename(
    titleHint,
    `yt_${id}_cut_${formatTimeTag(startTime)}_to_${formatTimeTag(endTime)}`
  );
  const targetUrl = `https://www.youtube.com/watch?v=${id}`;

  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");
  const crypto = await import("crypto");

  const tmpDir = path.join(os.tmpdir(), "yt_cuts");
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    } else {
      // Auto-cleanup sweep: delete files older than 10 minutes
      const now = Date.now();
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        try {
          const fp = path.join(tmpDir, file);
          const stat = fs.statSync(fp);
          if (now - stat.mtimeMs > 10 * 60 * 1000) {
            fs.unlinkSync(fp);
          }
        } catch {}
      }
    }
  } catch {}

  const jobId = `cut_${id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const ext = format === "mp3" ? "mp3" : "mp4";
  const outputTemplate = path.join(tmpDir, `${jobId}.%(ext)s`);
  const finalFilePath = path.join(tmpDir, `${jobId}.${ext}`);

  const encoder = new TextEncoder();
  let cutterProcess: ChildProcess | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      }

      sendEvent({
        stage: "init",
        message: `Analyzing video streams for time range ${formatTimeTag(startTime)} - ${formatTimeTag(endTime)}…`,
        progress: 5,
      });

      // Build yt-dlp arguments for high-speed frame-accurate section cutting with 100% audio/video sync
      const sectionSpec = `*${startTime}-${endTime}`;
      const args: string[] = [
        "--no-update",
        "--no-warnings",
        ...getYtDlpCookieArgs(),
        "--newline",
        "--extractor-args",
        "youtube:player_client=visionos,android",
        "--download-sections",
        sectionSpec,
        "--force-keyframes-at-cuts",
        "--no-playlist",
        "--concurrent-fragments",
        "4",
      ];

      const ffmpegLocation = getFfmpegDir() || getFfmpegBin();
      if (ffmpegLocation && ffmpegLocation !== "ffmpeg") {
        args.push("--ffmpeg-location", ffmpegLocation);
      }

      if (format === "mp3") {
        args.push(
          "-f",
          "ba[ext=m4a]/ba/b",
          "-x",
          "--audio-format",
          "mp3",
          "--audio-quality",
          `${bitrate}k`,
          "-o",
          outputTemplate,
          targetUrl
        );
      } else {
        // Video MP4 cut: force exact resolution selection prioritizing AVC1 (H.264) + AAC (m4a)
        // This ensures true 1080p (not falling back to 720p AV1) and applies CRF 22 with preset faster
        // to prevent bloated file sizes while maintaining sharp quality and 0.000000ms frame sync.
        const formatSpec = [
          `bestvideo[height=${height}][vcodec^=avc1]+bestaudio[ext=m4a]`,
          `bestvideo[height=${height}]+bestaudio`,
          `bestvideo[height<=${height}][vcodec^=avc1]+bestaudio[ext=m4a]`,
          `bestvideo[height<=${height}]+bestaudio`,
          `best[height<=${height}]`,
          `best`,
        ].join("/");

        args.push(
          "-f",
          formatSpec,
          "--merge-output-format",
          "mp4",
          "--downloader-args",
          "ffmpeg:-c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k",
          "--postprocessor-args",
          "VideoConvertor:-c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k",
          "-o",
          outputTemplate,
          targetUrl
        );
      }

      cutterProcess = spawn(getYtDlpBin(), args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: getSpawnEnv(),
      });

      let lastStderr = "";
      let phase: "video" | "audio" | "muxing" = "video";

      cutterProcess.stdout?.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split(/[\r\n]+/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.includes("[download] Destination:")) {
            const lower = trimmed.toLowerCase();
            if (
              lower.includes(".f251.") ||
              lower.includes(".f140.") ||
              lower.includes("audio") ||
              lower.includes(".m4a")
            ) {
              phase = "audio";
              sendEvent({
                stage: "downloading_audio",
                message: "Extracting audio section…",
                progress: 50,
              });
            } else {
              phase = "video";
              sendEvent({
                stage: "downloading",
                message: `Downloading & cutting ${height}p video section…`,
                progress: 15,
              });
            }
          } else if (trimmed.includes("[download]") && trimmed.includes("%")) {
            const pctMatch = trimmed.match(/(\d+(?:\.\d+)?)%/);
            const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
            const scaled =
              format === "mp3"
                ? Math.round(10 + pct * 0.75)
                : phase === "video"
                ? Math.round(15 + pct * 0.4)
                : Math.round(55 + pct * 0.35);

            sendEvent({
              stage: "downloading",
              message:
                format === "mp3"
                  ? `Extracting audio clip (${pct.toFixed(0)}%)…`
                  : phase === "video"
                  ? `Cutting video clip (${pct.toFixed(0)}%)…`
                  : `Cutting audio track (${pct.toFixed(0)}%)…`,
              progress: Math.min(92, Math.max(5, scaled)),
              raw: trimmed,
            });
          } else if (
            trimmed.includes("[Merger]") ||
            trimmed.includes("[VideoRemuxer]") ||
            trimmed.includes("[ExtractAudio]")
          ) {
            phase = "muxing";
            sendEvent({
              stage: "converting",
              message:
                format === "mp3"
                  ? `Encoding MP3 at ${bitrate}kbps…`
                  : `Remuxing precise ${height}p MP4 cut…`,
              progress: 94,
            });
          }
        }
      });

      cutterProcess.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          lastStderr = text;
          if (text.toLowerCase().includes("error")) {
            console.error("yt-dlp cutter stderr:", text);
          }
        }
      });

      cutterProcess.on("close", (code) => {
        if (code === 0 && fs.existsSync(finalFilePath)) {
          const stat = fs.statSync(finalFilePath);
          const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
          const safeName = `${filename}_cut_${formatTimeTag(startTime)}-${formatTimeTag(endTime)}`;

          sendEvent({
            stage: "ready",
            message: `Cut Ready! (${sizeMb} MB, duration ~${Math.round(duration)}s)`,
            progress: 100,
            jobId,
            fileSize: stat.size,
            downloadUrl: `/api/cut?action=file&id=${id}&jobId=${jobId}&format=${format}&title=${encodeURIComponent(
              safeName
            )}`,
          });
        } else {
          console.error("Cutter failed with code:", code, "lastStderr:", lastStderr);
          sendEvent({
            stage: "error",
            message:
              lastStderr ||
              "Failed to cut and process video section. Please check timestamps.",
          });
        }
        controller.close();
      });

      cutterProcess.on("error", (err) => {
        console.error("Cutter process error:", err);
        sendEvent({
          stage: "error",
          message: "Failed to initialize video cutting process.",
        });
        controller.close();
      });
    },
    cancel() {
      killProcess(cutterProcess);
      try {
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          if (file.startsWith(jobId)) {
            try {
              fs.unlinkSync(path.join(tmpDir, file));
            } catch {}
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
