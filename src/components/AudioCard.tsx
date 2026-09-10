"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, Pause, Plus, Check, Headphones, Download, ListPlus } from "lucide-react";
import { usePlayerActions, useTrackCardState } from "@/context/PlayerContext";

interface AudioCardProps {
  video: {
    id: string;
    title: string;
    uploader: string;
    duration: number;
    duration_string: string;
    thumbnail: string;
    view_count?: number;
    url: string;
  };
}

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

export function AudioCard({ video }: AudioCardProps) {
  const { playTrack, togglePlay, addToQueue, openDownloadModal, addToPlayNext } =
    usePlayerActions();
  const { isCurrent, isCardPlaying, isCardLoading } = useTrackCardState(video.id);
  const [added, setAdded] = useState(false);
  const [addedNext, setAddedNext] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(video);
    }
  };

  const handleQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(video);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handlePlayNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToPlayNext(video);
    setAddedNext(true);
    setTimeout(() => setAddedNext(false), 1800);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDownloadModal(video);
  };

  const formatViews = (views?: number) => {
    if (!views) return "";
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const thumbnailSrc = imgError ? FALLBACK_THUMB : video.thumbnail;

  return (
    <div
      className={`audio-card ${isCurrent ? "audio-card-active" : ""}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
    >
      {/* Thumbnail Container */}
      <div className="thumbnail-wrapper">
        <Image
          src={thumbnailSrc}
          alt={video.title}
          className="thumbnail-img"
          fill
          sizes="(max-width: 540px) 100vw, (max-width: 900px) 50vw, 280px"
          onError={() => setImgError(true)}
        />

        {/* Audio Only Badge */}
        <div className="audio-badge">
          <Headphones size={12} />
          <span>AUDIO</span>
        </div>

        {/* Duration Pill */}
        <div className="duration-pill">
          {video.duration_string || "Audio"}
        </div>

        {/* Hover / Playing Overlay */}
        <div className={`overlay ${isCardPlaying ? "overlay-active" : ""}`}>
          <div className="play-circle">
            {isCardLoading ? (
              <div className="spinner" />
            ) : isCardPlaying ? (
              <Pause size={24} color="#ffffff" />
            ) : (
              <Play size={24} color="#ffffff" style={{ marginLeft: "3px" }} />
            )}
          </div>
          <span className="overlay-text">
            {isCardLoading ? "Loading..." : isCardPlaying ? "Now playing" : "Play"}
          </span>
        </div>

        {/* Active Equalizer animation in thumbnail */}
        {isCardPlaying && (
          <div className="playing-bars">
            <div className="bar bar-1" />
            <div className="bar bar-2" />
            <div className="bar bar-3" />
            <div className="bar bar-4" />
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="card-details">
        <div className="channel-avatar">
          {video.uploader.charAt(0).toUpperCase()}
        </div>

        <div className="text-content">
          <h3 className="card-title" title={video.title}>
            {video.title}
          </h3>
          <p className="card-uploader" title={video.uploader}>
            {video.uploader}
          </p>
          <div className="card-meta">
            {video.view_count ? (
              <span>{formatViews(video.view_count)} • Audio</span>
            ) : (
              <span>YTaudio • High Quality</span>
            )}
          </div>
        </div>

        {/* Action Buttons: Play Next, Add to Queue & Download */}
        <div className="card-actions-row">
          <button
            className={`card-action-btn ${addedNext ? "queue-added" : ""}`}
            onClick={handlePlayNextClick}
            title={addedNext ? "Added to Play Next" : "Play Next"}
            aria-label="Play Next"
          >
            {addedNext ? <Check size={16} /> : <ListPlus size={16} />}
          </button>

          <button
            className={`card-action-btn ${added ? "queue-added" : ""}`}
            onClick={handleQueueClick}
            title={added ? "Added to Queue" : "Add to Queue"}
            aria-label="Add to Queue"
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>

          <button
            className="card-action-btn"
            onClick={handleDownloadClick}
            title="Download Audio / Video"
            aria-label="Download Media"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .audio-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          border-radius: var(--radius-lg);
          padding: 8px;
          background: transparent;
          transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }

        .audio-card:hover {
          background: var(--bg-surface);
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
        }

        .audio-card-active {
          background: var(--bg-surface);
          border: 1px solid var(--border-active);
          box-shadow: 0 0 20px rgba(255, 0, 51, 0.2);
        }

        .thumbnail-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-elevated);
        }

        .thumbnail-wrapper :global(.thumbnail-img) {
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .audio-card:hover :global(.thumbnail-img) {
          transform: scale(1.04);
        }

        .audio-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          color: var(--accent-cyan);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(0, 240, 255, 0.3);
          z-index: 2;
        }

        .duration-pill {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(6px);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 2;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(10, 11, 14, 0.65);
          backdrop-filter: blur(2px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 3;
        }

        .audio-card:hover .overlay,
        .overlay-active {
          opacity: 1;
        }

        .play-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 18px var(--yt-red-glow);
          transition: transform 0.2s ease;
        }

        .audio-card:hover .play-circle {
          transform: scale(1.1);
        }

        .overlay-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.4px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .playing-bars {
          position: absolute;
          bottom: 8px;
          left: 8px;
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 18px;
          background: rgba(0, 0, 0, 0.75);
          padding: 3px 6px;
          border-radius: 4px;
          z-index: 4;
        }

        .bar {
          width: 3px;
          background: var(--yt-red);
          border-radius: 2px;
          animation: equalizer 0.8s ease-in-out infinite alternate;
        }
        .bar-1 { animation-delay: 0.1s; }
        .bar-2 { animation-delay: 0.3s; }
        .bar-3 { animation-delay: 0.2s; }
        .bar-4 { animation-delay: 0.4s; }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .card-details {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          position: relative;
        }

        .channel-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2a2e3d, #1c1e28);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--accent-cyan);
          flex-shrink: 0;
        }

        .text-content {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.35;
          color: var(--text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .card-uploader {
          font-size: 0.82rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-uploader:hover {
          color: var(--text-primary);
        }

        .card-meta {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .card-actions-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-action-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-hover);
          color: var(--text-secondary);
          opacity: 0;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .audio-card:hover .card-action-btn {
          opacity: 1;
        }

        .card-action-btn:hover {
          background: var(--bg-active);
          color: var(--text-primary);
          transform: scale(1.1);
        }

        .queue-added {
          background: #2ecc71 !important;
          color: #ffffff !important;
          opacity: 1 !important;
        }

        @media (max-width: 768px) {
          .card-action-btn {
            opacity: 1;
            background: var(--bg-elevated);
          }
          .audio-card:active {
            transform: scale(0.98);
          }
          .card-title {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
