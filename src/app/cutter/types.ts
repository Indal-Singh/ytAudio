export interface SearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  url: string;
}

export interface VideoQuality {
  height: number;
  label: string;
  fps?: number;
  hasAudio: boolean;
  ext: string;
  filesizeApprox?: number;
}

export type CutterFormat = "mp4" | "mp3";

// Utility: parse seconds to HH:MM:SS or MM:SS
export function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
}

// Utility: parse time string (HH:MM:SS or MM:SS or seconds) to numeric seconds
export function parseTimeToSeconds(val: string): number {
  const clean = val.trim();
  if (!clean) return 0;
  if (!clean.includes(":")) {
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  }
  const parts = clean.split(":").map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Utility: extract YouTube ID from URL or bare ID
export function extractYouTubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("?")[0] || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") {
        return parts[1] || null;
      }
    }
  } catch {
    // Not a valid URL
  }
  return null;
}
