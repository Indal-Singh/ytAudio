"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Headphones,
  Download,
  Sparkles,
  Clock,
  Check,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./VideoPlayerModal.css";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDownload: () => void;
}

function formatSyncTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  onOpenDownload,
}: VideoPlayerModalProps) {
  const { currentTrack, getCurrentTime, pauseAudio, syncTimeAndPlay } = usePlayer();
  const [quality, setQuality] = useState<"1080" | "720" | "480" | "360">("1080");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [displaySyncTime, setDisplaySyncTime] = useState<number>(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const initialStartTimeRef = useRef<number>(0);
  const latestVideoTimeRef = useRef<number>(0);
  const openTimestampRef = useRef<number>(0);

  // Stop background audio and setup start position as soon as modal opens
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    // 1. Immediately pause background audio so there is no double playing
    pauseAudio();

    // 2. Capture starting timestamp from audio (ref — avoids timeupdate re-renders)
    const startSec = Math.max(0, Math.floor(getCurrentTime()));
    initialStartTimeRef.current = startSec;
    latestVideoTimeRef.current = startSec;
    setDisplaySyncTime(startSec);
    openTimestampRef.current = Date.now();

    // 3. Setup postMessage listener for YouTube IFrame API communication
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data && data.event === "infoDelivery" && data.info) {
          if (
            typeof data.info.currentTime === "number" &&
            !isNaN(data.info.currentTime)
          ) {
            latestVideoTimeRef.current = data.info.currentTime;
            setDisplaySyncTime(data.info.currentTime);
          }
        }
      } catch {
        // Non-JSON or third-party message, ignore safely
      }
    };

    window.addEventListener("message", handleWindowMessage);

    // 4. Polling query to YouTube iframe to continuously receive currentTime
    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "getCurrentTime",
              args: [],
            }),
            "*"
          );
        } catch {
          // Ignore iframe cross-origin postMessage errors if any
        }
      }

      // Fallback update if iframe API response is delayed
      if (latestVideoTimeRef.current === initialStartTimeRef.current) {
        const elapsedSinceOpen = (Date.now() - openTimestampRef.current) / 1000;
        if (elapsedSinceOpen > 1) {
          setDisplaySyncTime(initialStartTimeRef.current + elapsedSinceOpen);
        }
      }
    }, 400);

    // 5. Escape key to close & sync
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [isOpen, currentTrack, pauseAudio, getCurrentTime]);

  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      // Send listening handshake so YouTube iframe starts transmitting infoDelivery events
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
        }),
        "*"
      );
    } catch (e) {
      console.warn("Iframe handshake error:", e);
    }
  }, []);

  // Close modal and sync audio playback seamlessly
  const handleClose = useCallback(
    (autoPlayAudio: boolean = true) => {
      // Release YouTube audio focus before resuming our <audio> (critical on mobile)
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "pauseVideo",
              args: [],
            }),
            "*"
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "stopVideo",
              args: [],
            }),
            "*"
          );
        } catch {
          // Ignore
        }
      }

      let finalTime = latestVideoTimeRef.current;

      // If YouTube postMessage didn't update yet, calculate from open duration
      if (finalTime <= initialStartTimeRef.current) {
        const elapsed = (Date.now() - openTimestampRef.current) / 1000;
        if (elapsed > 0.5) {
          finalTime = initialStartTimeRef.current + elapsed;
        }
      }

      const validTime = Math.max(0, isNaN(finalTime) ? 0 : finalTime);

      // Sync audio player position and resume playing audio
      syncTimeAndPlay(validTime, autoPlayAudio);
      onClose();
    },
    [syncTimeAndPlay, onClose]
  );

  const handleSelectQuality = (q: "1080" | "720" | "480" | "360") => {
    setQuality(q);
    setShowQualityMenu(false);

    // Attempt to set playback quality on YouTube iframe
    const qualityMap: Record<string, string> = {
      "1080": "hd1080",
      "720": "hd720",
      "480": "large",
      "360": "medium",
    };

    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "setPlaybackQuality",
            args: [qualityMap[q]],
          }),
          "*"
        );
      } catch (e) {
        console.warn("Quality change error:", e);
      }
    }
  };

  if (!isOpen || !currentTrack) return null;

  const qualities = [
    { label: "1080p (HD)", value: "1080" },
    { label: "720p (HD)", value: "720" },
    { label: "480p", value: "480" },
    { label: "360p", value: "360" },
  ];

  const initialStartSecond = Math.max(0, Math.floor(initialStartTimeRef.current || getCurrentTime()));

  return (
    <div className="video-overlay" onClick={() => handleClose(true)}>
      <div className="video-card glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="video-header">
          <div className="title-area">
            <div className="live-pill">
              <span className="dot" />
              <span>VIDEO MODE</span>
            </div>
            <h3 className="video-title" title={currentTrack.title}>
              {currentTrack.title}
            </h3>
          </div>

          <div className="actions-area">
            {/* Live Sync Badge */}
            <div className="sync-pill" title="Playback synchronized with audio">
              <Clock size={12} />
              <span>{formatSyncTime(displaySyncTime)}</span>
            </div>

            {/* Switch back to Audio Button */}
            <button
              className="switch-audio-btn"
              onClick={() => handleClose(true)}
              title="Resume Audio Only from this exact point"
            >
              <Headphones size={15} />
              <span>Audio Only</span>
            </button>

            {/* Download Media */}
            <button
              className="icon-btn"
              onClick={() => {
                handleClose(false);
                onOpenDownload();
              }}
              title="Download Video/Audio"
            >
              <Download size={18} />
            </button>

            {/* Quality Selector */}
            <div className="quality-dropdown-wrapper">
              <button
                className="icon-btn quality-btn"
                onClick={() => setShowQualityMenu((prev) => !prev)}
                title="Select Quality"
              >
                <span>{quality}p</span>
              </button>

              {showQualityMenu && (
                <div className="quality-menu glass-panel">
                  <div className="menu-header">Quality</div>
                  {qualities.map((q) => (
                    <button
                      key={q.value}
                      className={`menu-item ${
                        quality === q.value ? "menu-item-active" : ""
                      }`}
                      onClick={() =>
                        handleSelectQuality(
                          q.value as "1080" | "720" | "480" | "360"
                        )
                      }
                    >
                      <span>{q.label}</span>
                      {quality === q.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <button
              className="close-btn"
              onClick={() => handleClose(true)}
              aria-label="Close video player"
              title="Close & Resume Audio"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Player Frame with initial start timestamp */}
        <div className="player-frame-wrapper">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
              currentTrack.id
            )}?autoplay=1&enablejsapi=1&start=${initialStartSecond}&rel=0&origin=${
              typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""
            }`}
            title={currentTrack.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="video-iframe"
            onLoad={handleIframeLoad}
          />
        </div>

        {/* Bottom Details Footer */}
        <div className="video-footer">
          <div className="footer-meta">
            <span className="channel-name">{currentTrack.uploader}</span>
            <span className="sep">•</span>
            <span className="badge-pill">Quality: {quality}p</span>
            <span className="sep">•</span>
            <span className="sync-tip">
              Closing resumes audio from {formatSyncTime(displaySyncTime)}
            </span>
          </div>

          <div className="footer-actions">
            <button
              className="text-btn"
              onClick={() => {
                handleClose(false);
                onOpenDownload();
              }}
            >
              <Download size={14} />
              <span>Download MP4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
