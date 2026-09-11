"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronUp,
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
  Disc,
  Video,
  Download,
} from "lucide-react";
import { usePlayer, usePlayerTime } from "@/context/PlayerContext";
import { MobileFullscreenPlayer } from "./MobileFullscreenPlayer";
import "./PlayerBar.css";

export function PlayerBar() {
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
    lastSession,
    resumeLastSession,
    showVisualizer,
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
  } = usePlayer();
  const currentTime = usePlayerTime();
  const upcomingCount = Math.max(0, queue.length - queueIndex - 1);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? ((isScrubbing ? scrubValue : currentTime) / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleSeekStart = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setIsScrubbing(false);
    seek(val);
  };

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  if (!currentTrack) {
    return (
      <div className="player-empty-bar glass-dock">
        {lastSession ? (
          <div className="empty-resume-content">
            <div className="empty-left">
              <Disc size={18} className="empty-disc-icon spin-slow" />
              <span className="empty-text">
                Resume &ldquo;{lastSession.track.title}&rdquo; from{" "}
                <strong className="resume-accent-time">
                  {formatTime(lastSession.position)}
                </strong>
              </span>
            </div>
            <button
              className="quick-resume-dock-btn"
              onClick={resumeLastSession}
              title="Resume track"
            >
              <Play size={13} fill="#ffffff" color="#ffffff" style={{ marginLeft: "1px" }} />
              <span>Resume Playback</span>
            </button>
          </div>
        ) : (
          <div className="empty-content">
            <Disc size={20} className="empty-disc-icon" />
            <span>Select any track above or paste a YouTube URL to play audio</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <footer className="player-bar-container glass-dock">
      {/* Top Timeline Bar across the entire player */}
      <div className="timeline-container">
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
          className="scrub-slider"
          aria-label="Seek track"
        />
        <div
          className="scrub-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      <div className="player-content">
        {/* Left Section: Track Info */}
        <div
          className="track-info-section"
          onClick={() => setShowFullscreenPlayer(true)}
          title="Tap to open fullscreen player"
        >
          <div className={`mini-thumbnail-box ${isPlaying ? "thumbnail-playing" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className={`mini-thumb-img ${isPlaying ? "animate-spin-slow" : ""}`}
            />
            <div className="vinyl-center-dot" />
          </div>

          <div className="track-meta">
            <h4 className="track-title" title={currentTrack.title}>
              {currentTrack.title}
            </h4>
            <p className="track-uploader" title={currentTrack.uploader}>
              {currentTrack.uploader}
            </p>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
            target="_blank"
            rel="noreferrer"
            className="yt-link-btn"
            title="Open on YouTube"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Center Section: Controls & Time */}
        <div className="player-controls-section">
          <div className="controls-row">
            {/* Shuffle */}
            <button
              className={`ctrl-btn ${isShuffling ? "ctrl-active" : ""}`}
              onClick={toggleShuffle}
              title={isShuffling ? "Shuffle ON" : "Shuffle OFF"}
            >
              <Shuffle size={16} />
            </button>

            {/* Skip 10s Backward */}
            <button
              className="ctrl-btn"
              onClick={() => skipBy(-10)}
              title="Rewind 10 seconds"
            >
              <RotateCcw size={17} />
            </button>

            {/* Previous */}
            <button
              className="ctrl-btn"
              onClick={playPrev}
              title="Previous Track"
            >
              <SkipBack size={20} />
            </button>

            {/* Big Play / Pause Button */}
            <button
              className="play-main-btn"
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="ctrl-spinner" />
              ) : isPlaying ? (
                <Pause size={22} color="#ffffff" />
              ) : (
                <Play size={22} color="#ffffff" style={{ marginLeft: "2px" }} />
              )}
            </button>

            {/* Next */}
            <button
              className="ctrl-btn"
              onClick={playNext}
              title="Next Track"
            >
              <SkipForward size={20} />
            </button>

            {/* Skip 10s Forward */}
            <button
              className="ctrl-btn"
              onClick={() => skipBy(10)}
              title="Forward 10 seconds"
            >
              <RotateCw size={17} />
            </button>

            {/* Repeat / Loop */}
            <button
              className={`ctrl-btn ${isLooping ? "ctrl-active" : ""}`}
              onClick={toggleLoop}
              title={isLooping ? "Repeat ON" : "Repeat OFF"}
            >
              <Repeat size={16} />
            </button>
          </div>

          <div className="time-display">
            <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
            <span className="time-sep">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Video Switcher, Download, Speed, Visualizer, Volume, Queue */}
        <div className="player-actions-section">
          {/* Switch to Video Button — hidden on narrow mobile (iframe steals audio focus) */}
          <button
            className="video-mode-btn"
            onClick={() => {
              pauseAudio();
              setShowVideoModal(true);
            }}
            title="Switch to Video Mode (1080p, 720p, etc.)"
          >
            <Video size={16} color="#00f0ff" />
            <span className="video-mode-label">Watch Video</span>
          </button>

          {/* Download Button */}
          <button
            className="action-btn"
            onClick={() => openDownloadModal(currentTrack)}
            title="Download Audio (MP3) or Video (MP4)"
          >
            <Download size={18} />
          </button>

          {/* Visualizer Button */}
          <button
            className={`action-btn ${showVisualizer ? "action-btn-active" : ""}`}
            onClick={() => setShowVisualizer((prev) => !prev)}
            title="Audio Visualizer"
          >
            <Activity size={18} />
          </button>

          {/* Speed Selector */}
          <div className="speed-selector-wrapper" ref={speedMenuRef}>
            <button
              className="action-btn speed-btn"
              onClick={() => setShowSpeedMenu((prev) => !prev)}
              title="Playback Speed"
            >
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="speed-dropdown glass-panel">
                <div className="dropdown-title">Speed</div>
                {speeds.map((s) => (
                  <button
                    key={s}
                    className={`speed-option ${playbackRate === s ? "speed-active" : ""}`}
                    onClick={() => {
                      setPlaybackRate(s);
                      setShowSpeedMenu(false);
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="volume-group">
            <button
              className="action-btn"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={19} />
              ) : volume < 0.5 ? (
                <Volume1 size={19} />
              ) : (
                <Volume2 size={19} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="volume-slider"
              aria-label="Volume Slider"
            />
          </div>

          {/* Queue Button */}
          <button
            className="action-btn queue-dock-btn"
            onClick={() => setShowQueueDrawer((prev) => !prev)}
            title="Up Next Queue"
          >
            <ListMusic size={19} />
            {upcomingCount > 0 && <span className="queue-pill">{upcomingCount}</span>}
          </button>

          {/* Mobile Fullscreen Expand Button */}
          <button
            className="action-btn mobile-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullscreenPlayer(true);
            }}
            title="Expand Fullscreen Player"
            aria-label="Expand Fullscreen Player"
          >
            <ChevronUp size={22} />
          </button>
        </div>
      </div>

      {/* Fullscreen Player for Mobile view with rich controls */}
      <MobileFullscreenPlayer />
    </footer>
  );
}
