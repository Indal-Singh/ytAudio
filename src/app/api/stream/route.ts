import { NextRequest, NextResponse } from "next/server";
import { getAudioStreamDetails } from "@/lib/ytdlp";

const CACHE_HEADERS = {
  // Stream URLs expire; keep short shared cache for prefetch bursts
  "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing video id parameter." },
      { status: 400 }
    );
  }

  try {
    const details = await getAudioStreamDetails(id);
    return NextResponse.json(
      { success: true, ...details },
      { headers: CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to extract audio";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
