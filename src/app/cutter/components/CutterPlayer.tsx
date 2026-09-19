"use client";

import React from "react";
import {
  Scissors,
  Search,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatTime, extractYouTubeId } from "../types";

interface CutterPlayerProps {
  videoId: string;
  videoTitle: string;
  videoAuthor: string;
  videoDuration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoadingVideo: boolean;
  isEmbedRestricted: boolean;
  setIsEmbedRestricted: React.Dispatch<React.SetStateAction<boolean>>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  handleIframeLoad: () => void;
  togglePlayPause: () => void;
  seekPlayer: (seconds: number) => void;
  onChangeVideo: () => void;
  loadVideo: (id: string) => void;
  executeSearch: (queryText: string) => void;
  setInputQuery: (val: string) => void;
}

export function CutterPlayer({
  videoId,
  videoTitle,
  videoAuthor,
  videoDuration,
  currentTime,
  isPlaying,
  isLoadingVideo,
  isEmbedRestricted,
  setIsEmbedRestricted,
  iframeRef,
  handleIframeLoad,
  togglePlayPause,
  seekPlayer,
  onChangeVideo,
  loadVideo,
  executeSearch,
  setInputQuery,
}: CutterPlayerProps) {
  return (
    <div className="cutter-card cutter-player-card">
      {!videoId ? (
        <div className="cutter-empty-player-state">
          <div className="cutter-empty-icon-halo">
            <Scissors size={32} />
          </div>
          <h3 className="cutter-empty-title">Ready to Cut Any YouTube Video</h3>
          <p className="cutter-empty-subtitle">
            Search for any song, video, or podcast, or paste a YouTube URL in the search bar above to load it into the studio.
          </p>
          <div className="cutter-empty-quick-actions">
            <button
              type="button"
              className="cutter-empty-action-btn primary"
              onClick={() => {
                const input = document.getElementById("cutter-input-field");
                if (input) input.focus();
              }}
            >
              <Search size={15} />
              <span>Search YouTube</span>
            </button>
            <button
              type="button"
              className="cutter-empty-action-btn"
              onClick={async () => {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip) {
                    setInputQuery(clip);
                    const id = extractYouTubeId(clip);
                    if (id) loadVideo(id);
                    else executeSearch(clip);
                  }
                } catch {}
              }}
            >
              <span>📋 Paste from Clipboard</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="cutter-video-wrapper">
            <iframe
              ref={iframeRef}
              id="cutter-yt-iframe"
              className="cutter-iframe"
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&vq=hd1080&hd=1&autoplay=0&controls=1&rel=0&modestbranding=1&origin=${
                typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""
              }&widget_referrer=${
                typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""
              }`}
              title={videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
            />

            {isEmbedRestricted && (
              <div className="cutter-embed-restricted-overlay">
                <div className="cutter-restricted-card">
                  <div className="cutter-restricted-icon-wrap">
                    <AlertTriangle size={28} className="cutter-restricted-icon" />
                  </div>
                  <h4 className="cutter-restricted-title">Playback Disabled by Video Owner</h4>
                  <p className="cutter-restricted-desc">
                    The video creator has turned off embedded playback on external websites.
                    Don&apos;t worry! You can still set your start & end markers below and download the cut clip directly without quality loss.
                  </p>
                  <div className="cutter-restricted-actions">
                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cutter-restricted-btn-primary"
                    >
                      <ExternalLink size={14} />
                      <span>Watch Timestamps on YouTube</span>
                    </a>
                    <button
                      type="button"
                      className="cutter-restricted-btn-dismiss"
                      onClick={() => setIsEmbedRestricted(false)}
                    >
                      Dismiss & Use Timeline Trimmer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Helper notice if video is blocked */}
          <div className="cutter-embed-helper-bar">
            <span>Can&apos;t play or seeing retro static TVs?</span>
            <button
              type="button"
              onClick={() => setIsEmbedRestricted((prev) => !prev)}
              className="cutter-embed-helper-toggle"
            >
              {isEmbedRestricted ? "Hide Notice" : "Video Owner Embed Restriction Guide"}
            </button>
          </div>

          {/* Video Title & Meta */}
          <div className="cutter-video-meta">
            <div className="cutter-video-meta-top">
              <h3 className="cutter-video-title">{videoTitle}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={onChangeVideo}
                  title="Clear active video and choose another"
                >
                  <RotateCcw size={12} />
                  <span>Change Video</span>
                </button>
                <span className="cutter-badge-hd">
                  {isLoadingVideo ? (
                    <>
                      <Loader2
                        size={12}
                        className="cutter-spinner"
                        style={{ display: "inline", marginRight: "4px" }}
                      />
                      LOADING…
                    </>
                  ) : (
                    "HD READY"
                  )}
                </span>
              </div>
            </div>
            <div className="cutter-video-author">{videoAuthor}</div>
          </div>

          {/* Custom Player Control Toolbar */}
          <div className="cutter-player-controls">
            <div className="cutter-ctrl-group">
              <button
                type="button"
                className="cutter-ctrl-play-btn"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                className="cutter-ctrl-btn"
                onClick={() => seekPlayer(currentTime - 5)}
                title="Rewind 5 seconds"
              >
                -5s
              </button>
              <button
                type="button"
                className="cutter-ctrl-btn"
                onClick={() => seekPlayer(currentTime + 5)}
                title="Fast forward 5 seconds"
              >
                +5s
              </button>
            </div>

            <div className="cutter-time-counter">
              <strong>{formatTime(currentTime)}</strong> / {formatTime(videoDuration)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
