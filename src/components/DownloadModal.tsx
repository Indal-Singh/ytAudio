"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Music,
  Video,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Track } from "@/context/PlayerContext";

interface DownloadModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DownloadModal({ track, isOpen, onClose }: DownloadModalProps) {
  const [downloadType, setDownloadType] = useState<"audio" | "video">("audio");
  const [audioBitrate, setAudioBitrate] = useState<string>("320");
  const [videoQuality, setVideoQuality] = useState<string>("720");
  const [videoAction, setVideoAction] = useState<"download" | "open">("download");
  const [availableQualities, setAvailableQualities] = useState<Array<{
    height: number;
    label: string;
    fps?: number;
    hasAudio: boolean;
    ext: string;
  }>>([]);
  const [isLoadingQualities, setIsLoadingQualities] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPct, setProgressPct] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<"idle" | "downloading" | "converting" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch real available video qualities when modal opens or track changes
  useEffect(() => {
    if (!isOpen || !track?.id) return;

    let isMounted = true;
    setIsLoadingQualities(true);

    fetch(`/api/download?type=formats&id=${encodeURIComponent(track.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data.qualities) && data.qualities.length > 0) {
          setAvailableQualities(data.qualities);
          // Default to highest quality available
          const bestDefault = data.qualities[0]?.height || 1080;
          setVideoQuality(String(bestDefault));
        } else {
          // Fallback standard options
          setAvailableQualities([
            { height: 1080, label: "1080p Full HD", hasAudio: true, ext: "mp4" },
            { height: 720, label: "720p HD", hasAudio: true, ext: "mp4" },
            { height: 480, label: "480p Standard", hasAudio: true, ext: "mp4" },
            { height: 360, label: "360p Data Saver", hasAudio: true, ext: "mp4" },
          ]);
        }
      })
      .catch((err) => {
        console.warn("Could not query available video formats:", err);
        if (!isMounted) return;
        setAvailableQualities([
          { height: 1080, label: "1080p Full HD", hasAudio: true, ext: "mp4" },
          { height: 720, label: "720p HD", hasAudio: true, ext: "mp4" },
          { height: 480, label: "480p Standard", hasAudio: true, ext: "mp4" },
          { height: 360, label: "360p Data Saver", hasAudio: true, ext: "mp4" },
        ]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingQualities(false);
      });

    return () => {
      isMounted = false;
      abortRef.current?.abort();
    };
  }, [isOpen, track?.id]);

  if (!isOpen || !track) return null;

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownloading(false);
    setProgressLabel("");
    setProgressPct(0);
    setCurrentStage("idle");
  };

  const handleClose = () => {
    if (downloading) handleCancel();
    onClose();
  };

  const handleStartDownload = async () => {
    setDownloading(true);
    setError(null);
    setVideoDownloadUrl(null);
    setProgressPct(0);
    setCurrentStage("idle");

    // ── VIDEO DOWNLOAD: Stream progressive status (downloading → converting → ready) ──
    if (downloadType === "video") {
      setCurrentStage("downloading");
      setProgressLabel(`Preparing ${videoQuality}p stream…`);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          id: track.id,
          type: "video",
          action: "start",
          quality: videoQuality,
          title: track.title || "",
        });

        const res = await fetch(`/api/download?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to start video conversion.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            const trimmed = block.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const data = JSON.parse(jsonStr);
              if (data.stage === "downloading" || data.stage === "downloading_audio") {
                setCurrentStage("downloading");
                setProgressLabel(data.message || "Downloading streams…");
                if (typeof data.progress === "number") setProgressPct(data.progress);
              } else if (data.stage === "converting") {
                setCurrentStage("converting");
                setProgressLabel(data.message || "Converting & muxing MP4…");
                setProgressPct(92);
              } else if (data.stage === "ready") {
                setCurrentStage("ready");
                setProgressLabel(data.message || "Video ready!");
                setProgressPct(100);
                setVideoDownloadUrl(data.downloadUrl);

                // Auto-trigger the file download from server
                const a = document.createElement("a");
                a.href = data.downloadUrl;
                a.download = `${(track.title || "video").replace(/[^\w\s.-]/gi, "_").slice(0, 80)}_${videoQuality}p.mp4`;
                document.body.appendChild(a);
                a.click();
                if (a.parentNode) {
                  a.parentNode.removeChild(a);
                }

                setDownloading(false);
                abortRef.current = null;
                return;
              } else if (data.stage === "error") {
                throw new Error(data.message || "Video processing failed");
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                console.error("SSE parse error:", parseErr);
              }
            }
          }
        }

        setDownloading(false);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setProgressLabel("Cancelled");
          setDownloading(false);
          setCurrentStage("idle");
          return;
        }
        const msg = err instanceof Error ? err.message : "Failed to process video";
        setError(msg);
        setDownloading(false);
        setProgressLabel("");
        setCurrentStage("idle");
      }
      return;
    }

    // ── AUDIO: ffmpeg-converted MP3 download ──
    setCurrentStage("converting");
    setProgressLabel("Converting & streaming MP3…");
    setProgressPct(20);

    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({
      id: track.id,
      type: "audio",
      bitrate: audioBitrate,
      title: track.title || "",
    });

    try {
      const res = await fetch(`/api/download?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Audio conversion failed to start");
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          // Approximate audio file size ~ 8-12 MB for 320kbps
          const approxPct = Math.min(95, Math.round((received / (9 * 1024 * 1024)) * 100));
          setProgressPct(approxPct);
          setProgressLabel(`Streaming MP3… ${formatBytes(received)}`);
        }
      }

      if (received < 1024) {
        throw new Error("MP3 download failed. Please try again.");
      }

      const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${(track.title || "download").replace(/[^\w\s.-]/gi, "_").slice(0, 80)}.mp3`;
      document.body.appendChild(a);
      a.click();
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
      URL.revokeObjectURL(objectUrl);

      setProgressLabel(`Done · ${formatBytes(received)}`);
      setDownloading(false);
      abortRef.current = null;
      setTimeout(() => onClose(), 600);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setProgressLabel("Cancelled");
        setDownloading(false);
        return;
      }
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
      setDownloading(false);
      setProgressLabel("");
    }
  };

  const bitrates = [
    { label: "320 kbps (Studio Master)", value: "320" },
    { label: "256 kbps (Very High)", value: "256" },
    { label: "192 kbps (Standard)", value: "192" },
    { label: "128 kbps (Compact)", value: "128" },
  ];

  const qualities = [
    { label: "1080p (Full HD)", value: "1080" },
    { label: "720p (HD Ready)", value: "720" },
    { label: "480p (Standard)", value: "480" },
    { label: "360p (Data Saver)", value: "360" },
  ];

  return (
    <div className="download-modal-overlay" onClick={handleClose}>
      <div className="download-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="download-header">
          <div className="header-title-box">
            <Download size={20} color="#ff0033" />
            <h3 className="header-title">Download Media</h3>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="download-body">
          <div className="track-summary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={track.thumbnail} alt={track.title} className="track-img" />
            <div className="track-info">
              <h4 className="track-title">{track.title}</h4>
              <p className="track-artist">{track.uploader}</p>
              <span className="track-duration">{track.duration_string || "Audio/Video"}</span>
            </div>
          </div>

          <div className="type-toggle-group">
            <button
              className={`type-btn ${downloadType === "audio" ? "type-active" : ""}`}
              onClick={() => setDownloadType("audio")}
              disabled={downloading}
            >
              <Music size={18} />
              <div className="type-text">
                <span className="type-name">Audio (MP3)</span>
                <span className="type-desc">{audioBitrate} kbps MP3</span>
              </div>
            </button>

            <button
              className={`type-btn ${downloadType === "video" ? "type-active" : ""}`}
              onClick={() => setDownloadType("video")}
              disabled={downloading}
            >
              <Video size={18} />
              <div className="type-text">
                <span className="type-name">Video</span>
                <span className="type-desc">Open link in new tab</span>
              </div>
            </button>
          </div>

          {downloadType === "audio" && (
            <div className="quality-section">
              <label className="quality-label">Select Audio Bitrate (MP3):</label>
              <div className="quality-grid">
                {bitrates.map((b) => (
                  <button
                    key={b.value}
                    className={`quality-chip ${audioBitrate === b.value ? "quality-active" : ""}`}
                    onClick={() => setAudioBitrate(b.value)}
                    disabled={downloading}
                  >
                    <span>{b.label}</span>
                    {audioBitrate === b.value && <Check size={14} color="#00f0ff" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {downloadType === "video" && (
            <div className="quality-section">
              <div className="quality-header-row">
                <label className="quality-label">Available Video Qualities:</label>
                {isLoadingQualities && (
                  <span className="quality-loading-badge">
                    <Loader2 size={12} className="spin" />
                    <span>Detecting qualities…</span>
                  </span>
                )}
              </div>

              <div className="quality-grid">
                {availableQualities.map((q) => (
                  <button
                    key={q.height}
                    className={`quality-chip ${videoQuality === String(q.height) ? "quality-active" : ""}`}
                    onClick={() => setVideoQuality(String(q.height))}
                    disabled={downloading}
                  >
                    <span className="chip-label">{q.label}</span>
                    {videoQuality === String(q.height) && <Check size={14} color="#00f0ff" />}
                  </button>
                ))}
              </div>


            </div>
          )}

          {error && <p className="download-error">{error}</p>}

          {downloading && (
            <div className="progress-card">
              <div className="progress-top-row">
                <div className="progress-stage-badge">
                  <span className={`stage-dot ${currentStage === "converting" ? "dot-convert" : ""}`} />
                  <span className="stage-title">
                    {currentStage === "converting"
                      ? "Converting & Muxing"
                      : currentStage === "downloading"
                      ? "Downloading Streams"
                      : "Preparing"}
                  </span>
                </div>
                {progressPct > 0 && (
                  <span className="progress-pct-val">{progressPct}%</span>
                )}
              </div>

              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${currentStage === "converting" ? "fill-convert" : ""}`}
                  style={{ width: `${Math.max(progressPct, 8)}%` }}
                />
              </div>

              <div className="progress-label-row">
                <Loader2 size={13} className="spin" />
                <span className="progress-status-text">{progressLabel}</span>
              </div>
            </div>
          )}

          {/* If video direct link is ready, provide prominent direct Download Button */}
          {videoDownloadUrl && downloadType === "video" && (
            <div className="direct-download-box">
              <a
                href={videoDownloadUrl}
                download={`${(track.title || "video").replace(/[^\w\s.-]/gi, "_").slice(0, 80)}_${videoQuality}p.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="direct-link-btn"
              >
                <Download size={16} />
                <span>Click here if download didn&apos;t start ({videoQuality}p MP4)</span>
              </a>
            </div>
          )}

          <div className="download-actions">
            {downloading ? (
              <button className="download-cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            ) : (
              <button className="download-action-btn" onClick={handleStartDownload}>
                <Download size={18} />
                <span>
                  {downloadType === "audio"
                    ? `Download MP3 (${audioBitrate} kbps)`
                    : `Download ${videoQuality}p Video`}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="download-footer">
          <Sparkles size={14} color="#00f0ff" />
          <span>Select any available resolution (1080p, 720p, 480p, 360p) with clear audio</span>
        </div>
      </div>

      <style jsx>{`
        .download-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2600;
          background: rgba(8, 10, 14, 0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .download-card {
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px var(--yt-red-glow);
          overflow: hidden;
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .download-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .header-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-title {
          font-size: 1.05rem;
          font-weight: 700;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-hover);
        }

        .close-btn:hover {
          background: var(--yt-red);
          color: #ffffff;
        }

        .download-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .track-summary {
          display: flex;
          gap: 12px;
          align-items: center;
          background: var(--bg-surface);
          padding: 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .track-img {
          width: 60px;
          height: 45px;
          object-fit: cover;
          border-radius: 6px;
        }

        .track-info {
          flex: 1;
          min-width: 0;
        }

        .track-title {
          font-size: 0.88rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-artist {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .track-duration {
          font-size: 0.72rem;
          color: var(--accent-cyan);
          font-family: var(--font-mono);
        }

        .type-toggle-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .type-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: all 0.2s ease;
          text-align: left;
        }

        .type-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .type-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .type-active {
          background: rgba(255, 0, 51, 0.12);
          border-color: var(--yt-red);
          color: #ffffff;
        }

        .type-text {
          display: flex;
          flex-direction: column;
        }

        .type-name {
          font-size: 0.88rem;
          font-weight: 600;
        }

        .type-desc {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .quality-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .quality-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .quality-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .quality-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .quality-loading-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: var(--accent-cyan);
          opacity: 0.85;
        }

        .quality-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .quality-chip:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .quality-chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .quality-active {
          border-color: var(--accent-cyan);
          color: #ffffff;
          background: rgba(0, 240, 255, 0.08);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
        }

        .direct-download-box {
          margin-top: 6px;
        }

        .direct-link-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 14px;
          background: rgba(0, 240, 255, 0.12);
          border: 1px solid var(--accent-cyan);
          border-radius: var(--radius-sm);
          color: var(--accent-cyan);
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .direct-link-btn:hover {
          background: var(--accent-cyan);
          color: #000000;
          box-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
        }

        .video-hint {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 4px;
        }

        .download-error {
          font-size: 0.82rem;
          color: #ff4d6d;
        }

        .progress-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 14px;
        }

        .progress-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .progress-stage-badge {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 8px var(--accent-cyan);
          animation: pulseDot 1.2s infinite ease-in-out;
        }

        .stage-dot.dot-convert {
          background: #ffaa00;
          box-shadow: 0 0 8px #ffaa00;
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .stage-title {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-primary);
        }

        .progress-pct-val {
          font-size: 0.8rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--accent-cyan);
        }

        .progress-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00f0ff, #0070f3);
          border-radius: 999px;
          transition: width 0.3s ease;
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }

        .progress-bar-fill.fill-convert {
          background: linear-gradient(90deg, #ffaa00, #ff0033);
          box-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
        }

        .progress-label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .progress-label-row :global(.spin) {
          animation: spin 0.8s linear infinite;
          color: var(--accent-cyan);
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .download-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .download-action-btn,
        .download-cancel-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px;
          border-radius: var(--radius-md);
          font-size: 0.92rem;
          font-weight: 600;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .download-action-btn {
          background: var(--gradient-brand);
          color: #ffffff;
          box-shadow: 0 4px 16px var(--yt-red-glow);
        }

        .download-action-btn:hover {
          transform: translateY(-1px);
        }

        .download-cancel-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .download-cancel-btn:hover {
          background: rgba(255, 0, 51, 0.15);
          border-color: var(--yt-red);
        }

        .download-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(18, 20, 26, 0.5);
        }
      `}</style>
    </div>
  );
}
