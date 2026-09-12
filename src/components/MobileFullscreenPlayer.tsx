"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Volume1,
  Activity,
  ListMusic,
  ExternalLink,
  Video,
  Download,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { usePlayer, usePlayerTime } from "@/context/PlayerContext";
import "./MobileFullscreenPlayer.css";

export function MobileFullscreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    duration,
    volume,
    isMuted,
    playbackRate,
    isLooping,
    isShuffling,
    queue,
    queueIndex,
    showVisualizer,
    showFullscreenPlayer,
    setShowFullscreenPlayer,
    togglePlay,
    seek,
    skipBy,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleLoop,
    toggleShuffle,
    playNext,
    playPrev,
    pauseAudio,
    setShowVisualizer,
    setShowQueueDrawer,
    setShowVideoModal,
    openDownloadModal,
    sponsorSegments,
    sponsorSettings,
    setShowSponsorModal,
  } = usePlayer();

  const currentTime = usePlayerTime();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Touch gesture state for swipe down to dismiss
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef<number>(0);
  const [dragTranslateY, setDragTranslateY] = useState(0);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent =
    duration > 0
      ? ((isScrubbing ? scrubValue : currentTime) / duration) * 100
      : 0;

  const handleSeekStart = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleSeekEnd = (
    e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>
  ) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setIsScrubbing(false);
    seek(val);
  };

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  // Touch handlers for swipe down
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;
    if (delta > 0) {
      touchDeltaY.current = delta;
      // Provide resistance
      setDragTranslateY(Math.min(delta * 0.7, 300));
    }
  };

  const onTouchEnd = () => {
    if (touchDeltaY.current > 90) {
      setShowFullscreenPlayer(false);
    }
    setDragTranslateY(0);
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showFullscreenPlayer) {
        setShowFullscreenPlayer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFullscreenPlayer, setShowFullscreenPlayer]);

  if (!showFullscreenPlayer || !currentTrack) {
    return null;
  }

  return (
    <div
      className={`fullscreen-player-overlay ${showFullscreenPlayer ? "open" : ""}`}
      style={{
        transform: dragTranslateY > 0 ? `translateY(${dragTranslateY}px)` : undefined,
      }}
    >
      {/* Blurred Album Artwork Ambient Background */}
      <div
        className="fullscreen-ambient-bg"
        style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
      />
      <div className="fullscreen-ambient-scrim" />

      <div
        className="fullscreen-player-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top Handle / Drag indicator */}
        <div className="fullscreen-drag-handle-bar">
          <div className="fullscreen-drag-pill" />
        </div>

        {/* Top Header Row */}
        <div className="fullscreen-top-bar">
          <button
            className="fullscreen-icon-btn minimize-btn"
            onClick={() => setShowFullscreenPlayer(false)}
            title="Minimize player"
            aria-label="Minimize player"
          >
            <ChevronDown size={28} />
          </button>

          <div className="fullscreen-header-title">
            <span className="header-subtitle">NOW PLAYING</span>
            {queue.length > 0 && (
              <span className="header-queue-pos">
                Track {queueIndex + 1} of {queue.length}
              </span>
            )}
          </div>

          <button
            className="fullscreen-icon-btn queue-toggle-btn"
            onClick={() => setShowQueueDrawer((prev) => !prev)}
            title="Up Next Queue"
            aria-label="Up Next Queue"
          >
            <ListMusic size={22} />
            {queue.length > 1 && (
              <span className="fullscreen-queue-pill">{queue.length}</span>
            )}
          </button>
        </div>

        {/* Artwork Showcase */}
        <div className="fullscreen-artwork-wrapper">
          <div
            className={`fullscreen-artwork-card ${
              isPlaying ? "artwork-playing" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="fullscreen-artwork-img"
            />
            {isPlaying && <div className="fullscreen-glow-ring" />}
          </div>
        </div>

        {/* Track Title & Meta */}
        <div className="fullscreen-track-info-section">
          <div className="fullscreen-track-meta">
            <h2 className="fullscreen-track-title" title={currentTrack.title}>
              {currentTrack.title}
            </h2>
            <p className="fullscreen-track-artist">{currentTrack.uploader}</p>
          </div>

          <div className="fullscreen-info-actions">
            <button
              type="button"
              className={`fullscreen-action-pill-btn ${
                sponsorSettings.enabled ? "sponsor-pill-active" : ""
              }`}
              onClick={() => setShowSponsorModal(true)}
              title={`SponsorBlock: ${
                sponsorSettings.enabled
                  ? sponsorSettings.autoSkip
                    ? "Auto-Skip Active"
                    : "Manual Prompt Active"
                  : "Disabled"
              }`}
            >
              <ShieldCheck
                size={18}
                color={sponsorSettings.enabled ? "#10b981" : "currentColor"}
              />
            </button>
            <button
              className="fullscreen-action-pill-btn"
              onClick={() => openDownloadModal(currentTrack)}
              title="Download track"
            >
              <Download size={18} />
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
              target="_blank"
              rel="noreferrer"
              className="fullscreen-action-pill-btn"
              title="Open on YouTube"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Scrubber / Progress Bar */}
        <div className="fullscreen-progress-wrapper">
          <div className="fullscreen-timeline-container">
            {duration > 0 &&
              sponsorSegments.map((seg, i) => {
                const startPct = (seg.segment[0] / duration) * 100;
                const widthPct =
                  ((seg.segment[1] - seg.segment[0]) / duration) * 100;
                return (
                  <div
                    key={seg.UUID || i}
                    className={`fullscreen-segment-marker seg-color-${seg.category.replace(
                      /[^a-z0-9]/gi,
                      "_"
                    )}`}
                    style={{
                      left: `${Math.max(0, Math.min(100, startPct))}%`,
                      width: `${Math.max(0.5, Math.min(100 - startPct, widthPct))}%`,
                    }}
                  />
                );
              })}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={isScrubbing ? scrubValue : currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="fullscreen-scrub-slider"
              aria-label="Seek track"
            />
            <div
              className="fullscreen-scrub-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              }}
            />
          </div>

          <div className="fullscreen-time-row">
            <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Playback Controls */}
        <div className="fullscreen-controls-cluster">
          <button
            className={`fullscreen-ctrl-btn ${
              isShuffling ? "ctrl-btn-active" : ""
            }`}
            onClick={toggleShuffle}
            title={isShuffling ? "Shuffle ON" : "Shuffle OFF"}
            aria-label="Toggle Shuffle"
          >
            <Shuffle size={20} />
          </button>

          <button
            className="fullscreen-ctrl-btn"
            onClick={playPrev}
            title="Previous track"
            aria-label="Previous Track"
          >
            <SkipBack size={24} />
          </button>

          <button
            className="fullscreen-ctrl-btn rewind-btn"
            onClick={() => skipBy(-10)}
            title="Rewind 10s"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={21} />
            <span className="skip-badge">10</span>
          </button>

          <button
            className="fullscreen-play-hero-btn"
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="fullscreen-hero-spinner" />
            ) : isPlaying ? (
              <Pause size={28} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play
                size={28}
                color="#ffffff"
                fill="#ffffff"
                style={{ marginLeft: "3px" }}
              />
            )}
          </button>

          <button
            className="fullscreen-ctrl-btn forward-btn"
            onClick={() => skipBy(10)}
            title="Forward 10s"
            aria-label="Forward 10 seconds"
          >
            <RotateCw size={21} />
            <span className="skip-badge">10</span>
          </button>

          <button
            className="fullscreen-ctrl-btn"
            onClick={playNext}
            title="Next track"
            aria-label="Next Track"
          >
            <SkipForward size={24} />
          </button>

          <button
            className={`fullscreen-ctrl-btn ${
              isLooping ? "ctrl-btn-active" : ""
            }`}
            onClick={toggleLoop}
            title={isLooping ? "Repeat ON" : "Repeat OFF"}
            aria-label="Toggle Repeat"
          >
            <Repeat size={20} />
          </button>
        </div>

        {/* Volume & Additional Controls */}
        <div className="fullscreen-volume-row">
          <button
            className="fullscreen-vol-icon-btn"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={20} />
            ) : volume < 0.5 ? (
              <Volume1 size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="fullscreen-volume-slider"
            aria-label="Volume Slider"
          />
        </div>

        {/* Bottom Utility Bar */}
        <div className="fullscreen-bottom-actions">
          {/* Speed Button */}
          <button
            className="fullscreen-util-btn"
            onClick={cycleSpeed}
            title={`Speed: ${playbackRate}x (tap to cycle)`}
          >
            <Gauge size={16} />
            <span>{playbackRate}x</span>
          </button>

          {/* Visualizer Toggle */}
          <button
            className={`fullscreen-util-btn ${
              showVisualizer ? "util-active" : ""
            }`}
            onClick={() => setShowVisualizer((prev) => !prev)}
            title="Audio Visualizer"
          >
            <Activity size={16} />
            <span>Visualizer</span>
          </button>

          {/* Video Switcher */}
          <button
            className="fullscreen-util-btn video-accent-btn"
            onClick={() => {
              pauseAudio();
              setShowVideoModal(true);
            }}
            title="Watch Video (1080p, 720p)"
          >
            <Video size={16} />
            <span>Video Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
