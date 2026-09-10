import { NextRequest } from "next/server";
import { getAudioStreamDetails, invalidateCache, extractVideoId } from "@/lib/ytdlp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchUpstream(audioUrl: string, range: string | null) {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
  };
  if (range) headers["Range"] = range;

  return fetch(audioUrl, {
    headers,
    redirect: "follow",
  });
}

function proxyResponse(upstreamRes: Response) {
  const responseHeaders = new Headers();
  const contentType = upstreamRes.headers.get("content-type") || "audio/webm";
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");

  const contentRange = upstreamRes.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let audioUrl = searchParams.get("url");
  const idParam = searchParams.get("id");
  const id = idParam ? extractVideoId(idParam) : null;
  const range = request.headers.get("range");

  try {
    if (!audioUrl && id) {
      const details = await getAudioStreamDetails(id);
      audioUrl = details.audioUrl;
    }

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: "Missing audio url or id" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    let upstreamRes = await fetchUpstream(audioUrl, range);

    // Stale googlevideo URLs → invalidate cache and re-extract once
    if (
      id &&
      (upstreamRes.status === 403 ||
        upstreamRes.status === 410 ||
        upstreamRes.status === 404)
    ) {
      invalidateCache(`audio:${id}`);
      try {
        const fresh = await getAudioStreamDetails(id);
        audioUrl = fresh.audioUrl;
        upstreamRes = await fetchUpstream(audioUrl, range);
      } catch (reErr) {
        console.error("Proxy re-extract failed:", reErr);
        return new Response(JSON.stringify({ error: "Stream expired and refresh failed" }), {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response("Streaming failed", {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    return proxyResponse(upstreamRes);
  } catch (err: unknown) {
    console.error("Audio proxy streaming error:", err);
    return new Response("Streaming failed", {
      status: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
