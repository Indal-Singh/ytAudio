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
  const [downloading, setDownloading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!isOpen || !track) return null;

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownloading(false);
    setProgressLabel("");
  };

  const handleClose = () => {
    if (downloading) handleCancel();
    onClose();
  };

  const handleStartDownload = async () => {
    setDownloading(true);
    setError(null);

    // VIDEO → resolve direct URL and open in a new tab
    if (downloadType === "video") {
      setProgressLabel("Resolving video link…");
      try {
        const params = new URLSearchParams({
          id: track.id,
          type: "video",
          quality: videoQuality,
          title: track.title || "",
        });
        const res = await fetch(`/api/download?${params.toString()}`);
        const data = await res.json();
        if (!data?.url) {
          throw new Error(data?.error || "Could not get video URL");
        }
        window.open(data.url, "_blank", "noopener,noreferrer");
        setProgressLabel(data.fallback ? "Opened YouTube page" : "Opened in new tab");
        setDownloading(false);
        setTimeout(() => onClose(), 700);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to open video";
        setError(msg);
        setDownloading(false);
        setProgressLabel("");
      }
      return;
    }

    // AUDIO → ffmpeg-converted MP3 download
    setProgressLabel("Preparing MP3…");

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
          setProgressLabel(`Downloading MP3… ${formatBytes(received)}`);
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
      document.body.removeChild(a);
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
              <label className="quality-label">Preferred quality (best match):</label>
              <div className="quality-grid">
                {qualities.map((q) => (
                  <button
                    key={q.value}
                    className={`quality-chip ${videoQuality === q.value ? "quality-active" : ""}`}
                    onClick={() => setVideoQuality(q.value)}
                    disabled={downloading}
                  >
                    <span>{q.label}</span>
                    {videoQuality === q.value && <Check size={14} color="#00f0ff" />}
                  </button>
                ))}
              </div>
              <p className="video-hint">
                Video opens as a direct stream link in a new tab (browser may play or download it).
              </p>
            </div>
          )}

          {error && <p className="download-error">{error}</p>}
          {downloading && progressLabel && (
            <div className="download-progress-row">
              <Loader2 size={14} className="spin" />
              <span>{progressLabel}</span>
            </div>
          )}

          <div className="download-actions">
            {downloading ? (
              <button className="download-cancel-btn" onClick={handleCancel}>
                Cancel download
              </button>
            ) : (
              <button className="download-action-btn" onClick={handleStartDownload}>
                <Download size={18} />
                <span>
                  {downloadType === "audio"
                    ? `Download MP3 (${audioBitrate} kbps)`
                    : `Open ${videoQuality}p video in new tab`}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="download-footer">
          <Sparkles size={14} color="#00f0ff" />
          <span>High-quality audio downloads · Video opens in a new tab</span>
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
        }

        .video-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 4px;
        }

        .download-error {
          font-size: 0.82rem;
          color: #ff4d6d;
        }

        .download-progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--accent-cyan);
        }

        .download-progress-row :global(.spin) {
          animation: spin 0.8s linear infinite;
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
