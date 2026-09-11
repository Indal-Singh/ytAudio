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
import { Track } from "@/context/playerTypes";
import "./DownloadModal.css";

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
    </div>
  );
}
