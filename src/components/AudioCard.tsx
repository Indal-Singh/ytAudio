"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, Pause, Plus, Check, Headphones, Download, ListPlus } from "lucide-react";
import { usePlayerActions, useTrackCardState } from "@/context/PlayerContext";
import "./AudioCard.css";

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
  playlist?: any[];
}

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";

export function AudioCard({ video, playlist }: AudioCardProps) {
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
      playTrack(video, 0, playlist ? { surroundingList: playlist } : undefined);
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
          sizes="(max-width: 540px) 92px, (max-width: 900px) 50vw, 280px"
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

    </div>
  );
}
