"use client";

import React, { useState, useRef } from "react";
import { X, Trash2, Play, ListMusic, RotateCcw, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./QueueDrawer.css";

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "";
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function QueueDrawer() {
  const {
    queue,
    queueIndex,
    currentTrack,
    showQueueDrawer,
    setShowQueueDrawer,
    isAutoplay,
    toggleAutoplay,
    playTrack,
    playFromQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    isFindingRelated,
    loadMoreRelatedSongs,
    rewindPlaylists,
    restoreRewindPlaylist,
    removeRewindPlaylist,
    clearRewindPlaylists,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<"queue" | "rewind">("queue");
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const upcomingCount = Math.max(0, queue.length - queueIndex - 1);
  const playedCount = Math.max(0, queueIndex);


  // ── Drag reorder state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragOffsetYRef = useRef(0);
  const dragItemRef = useRef<HTMLDivElement | null>(null);
  const itemHeightRef = useRef(62); // approximate item height

  // ── Swipe-to-remove state ──
  const swipeStartXRef = useRef(0);
  const swipeDeltaRef = useRef(0);
  const swipeItemRef = useRef<HTMLDivElement | null>(null);
  const isSwiping = useRef(false);

  // ── Drag reorder handlers ──
  const handleDragStart = (idx: number, clientY: number, el: HTMLDivElement) => {
    setDragIdx(idx);
    dragStartYRef.current = clientY;
    dragOffsetYRef.current = 0;
    dragItemRef.current = el;
    el.style.zIndex = "10";
    el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
    el.style.transition = "box-shadow 0.15s ease";
  };

  const handleDragMove = (clientY: number) => {
    if (dragIdx === null || !dragItemRef.current) return;
    const deltaY = clientY - dragStartYRef.current;
    dragOffsetYRef.current = deltaY;
    dragItemRef.current.style.transform = `translateY(${deltaY}px)`;
    dragItemRef.current.style.transition = "none";

    // Calculate if we've moved past an adjacent item
    const steps = Math.round(deltaY / itemHeightRef.current);
    if (steps !== 0) {
      const targetIdx = dragIdx + steps;
      if (targetIdx >= 0 && targetIdx < queue.length && targetIdx !== dragIdx) {
        moveInQueue(dragIdx, targetIdx);
        setDragIdx(targetIdx);
        dragStartYRef.current = clientY;
        dragOffsetYRef.current = 0;
        dragItemRef.current.style.transform = "translateY(0)";
      }
    }
  };

  const handleDragEnd = () => {
    if (dragItemRef.current) {
      dragItemRef.current.style.transform = "translateY(0)";
      dragItemRef.current.style.transition = "transform 0.2s ease";
      dragItemRef.current.style.zIndex = "";
      dragItemRef.current.style.boxShadow = "";
    }
    setDragIdx(null);
    dragItemRef.current = null;
  };

  // ── Swipe-to-remove handlers ──
  const handleSwipeStart = (clientX: number, el: HTMLDivElement) => {
    swipeStartXRef.current = clientX;
    swipeDeltaRef.current = 0;
    swipeItemRef.current = el;
    isSwiping.current = true;
  };

  const handleSwipeMove = (clientX: number) => {
    if (!isSwiping.current || !swipeItemRef.current || dragIdx !== null) return;
    const delta = Math.min(0, clientX - swipeStartXRef.current);
    swipeDeltaRef.current = delta;
    swipeItemRef.current.style.transform = `translateX(${delta}px)`;
    swipeItemRef.current.style.opacity = `${Math.max(0.3, 1 - Math.abs(delta) / 200)}`;
    swipeItemRef.current.style.transition = "none";
  };

  const handleSwipeEnd = (idx: number) => {
    if (!swipeItemRef.current) return;
    isSwiping.current = false;
    const el = swipeItemRef.current;
    el.style.transition = "transform 0.25s ease, opacity 0.25s ease";
    if (swipeDeltaRef.current < -80) {
      el.style.transform = "translateX(-120%)";
      el.style.opacity = "0";
      setTimeout(() => removeFromQueue(idx), 200);
    } else {
      el.style.transform = "translateX(0)";
      el.style.opacity = "1";
    }
    swipeItemRef.current = null;
  };

  if (!showQueueDrawer) return null;

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="queue-overlay" onClick={() => setShowQueueDrawer(false)}>
      <div className="drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="tabs-row">
            <button
              className={`tab-btn ${activeTab === "queue" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("queue")}
            >
              <ListMusic size={16} />
              <span>Playlist ({queue.length})</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "rewind" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("rewind")}
            >
              <RotateCcw size={14} />
              <span>Rewind Playlist ({rewindPlaylists.length})</span>
            </button>

          </div>
          <button
            className="close-drawer-btn"
            onClick={() => setShowQueueDrawer(false)}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Currently Playing Card — optional quick view; full list below includes it too */}
        {currentTrack && (
          <div className="now-playing-box">
            <div className="now-playing-label">
              NOW PLAYING · {queueIndex >= 0 ? `${queueIndex + 1} / ${queue.length}` : "—"}
            </div>
            <div className="now-track-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentTrack.thumbnail} alt={currentTrack.title} className="now-thumb" />
              <div className="now-info">
                <span className="now-title">{currentTrack.title}</span>
                <span className="now-artist">{currentTrack.uploader}</span>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div
          className="drawer-body"
          onScroll={(e) => {
            if (activeTab !== "queue") return;
            const target = e.currentTarget;
            // When scrolled within 180px of bottom, fetch more recommendations
            if (target.scrollHeight - target.scrollTop - target.clientHeight < 180) {
              void loadMoreRelatedSongs();
            }
          }}
          onMouseMove={(e) => { handleDragMove(e.clientY); handleSwipeMove(e.clientX); }}
          onMouseUp={() => { handleDragEnd(); }}
          onMouseLeave={() => { handleDragEnd(); if (isSwiping.current && swipeItemRef.current) { swipeItemRef.current.style.transform = "translateX(0)"; swipeItemRef.current.style.opacity = "1"; isSwiping.current = false; } }}
          onTouchMove={(e) => { handleDragMove(e.touches[0].clientY); handleSwipeMove(e.touches[0].clientX); }}
          onTouchEnd={() => { handleDragEnd(); }}
        >
          {activeTab === "queue" ? (
            <>
              {queue.length === 0 ? (
                <div className="empty-state">
                  <ListMusic size={36} color="var(--text-muted)" />
                  {isFindingRelated ? (
                    <>
                      <p>Finding similar songs…</p>
                      <span>Autoplay is pulling related tracks for continuous listening.</span>
                    </>
                  ) : (
                    <>
                      <p>Your playlist is empty.</p>
                      <span>Click &apos;+&apos; on any audio card to add tracks!</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="list-container">
                  <div className="list-header">
                    <div className="upcoming-title-wrap">
                      <span>Playlist</span>
                      <span className="upcoming-count-badge">
                        {playedCount > 0 ? `${playedCount} played · ` : ""}
                        {upcomingCount} up next
                      </span>
                    </div>
                    <div className="header-actions">
                      <button
                        className={`autoplay-pill-btn ${isAutoplay ? "autoplay-active" : ""}`}
                        onClick={toggleAutoplay}
                        title={isAutoplay ? "Autoplay is ON" : "Autoplay is OFF"}
                      >
                        <span className="autoplay-dot" />
                        <span>Autoplay {isAutoplay ? "ON" : "OFF"}</span>
                      </button>
                      <button className="clear-btn" onClick={clearQueue} title="Clear playlist">
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                  <div className="swipe-hint">← Swipe left to remove · Drag ≡ to reorder · Tap play to jump</div>
                  {isFindingRelated && upcomingCount === 0 && (
                    <div className="finding-related-banner">Finding similar songs…</div>
                  )}
                  {queue.map((track, idx) => {
                    const isCurrent = idx === queueIndex || track.id === currentTrack?.id;
                    const isPlayed = idx < queueIndex;
                    return (
                    <div
                      key={`${track.id}-${idx}`}
                      className={`track-item ${dragIdx === idx ? "track-dragging" : ""} ${isCurrent ? "track-current" : ""} ${isPlayed ? "track-played" : ""}`}
                      onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX, e.currentTarget as HTMLDivElement)}
                      onTouchEnd={() => handleSwipeEnd(idx)}
                      onMouseDown={(e) => { e.preventDefault(); handleSwipeStart(e.clientX, e.currentTarget as HTMLDivElement); }}
                      onMouseUp={() => handleSwipeEnd(idx)}
                    >
                      {/* Drag Handle */}
                      <div
                        className="drag-handle"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleDragStart(idx, e.clientY, e.currentTarget.parentElement as HTMLDivElement); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleDragStart(idx, e.touches[0].clientY, e.currentTarget.parentElement as HTMLDivElement); }}
                        title="Drag to reorder"
                      >
                        <GripVertical size={16} />
                      </div>

                      <span className="item-index">{idx + 1}</span>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="item-thumb cursor-pointer"
                        draggable={false}
                        onClick={() => playFromQueue(idx)}
                      />

                      <div className="item-info cursor-pointer" onClick={() => playFromQueue(idx)}>
                        <span className="item-title">
                          {isCurrent ? "▶ " : ""}
                          {track.title}
                        </span>
                        <span className="item-artist">
                          {isPlayed ? "Played · " : isCurrent ? "Playing · " : ""}
                          {track.uploader}
                          {track.duration_string ? ` • ${track.duration_string}` : ""}
                        </span>
                      </div>


                      <div className="item-actions">
                        <button
                          className="item-play-btn"
                          onClick={(e) => { e.stopPropagation(); playFromQueue(idx); }}
                          title={isCurrent ? "Playing now" : "Play this track"}
                        >
                          <Play size={14} color="#ffffff" style={{ marginLeft: "2px" }} />
                        </button>
                        <button
                          className="item-del-btn"
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                  {isFindingRelated && queue.length > 0 && (
                    <div className="bottom-loading-wrap">
                      <div className="bottom-loading-dot" />
                      <span>Loading more songs…</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {rewindPlaylists.length === 0 ? (
                <div className="empty-state">
                  <RotateCcw size={36} color="var(--text-muted)" />
                  <p>No Rewind Playlists yet.</p>
                  <span>Playlists and recommendations you listen to will automatically be saved here so you can rewind and replay them anytime!</span>
                </div>
              ) : (
                <div className="list-container">
                  <div className="list-header">
                    <div className="upcoming-title-wrap">
                      <span>Rewind Playlist</span>
                      <span className="upcoming-count-badge">
                        {rewindPlaylists.length} {rewindPlaylists.length === 1 ? "saved" : "saved"}
                      </span>
                    </div>
                    <button className="clear-btn" onClick={clearRewindPlaylists} title="Clear all rewind playlists">
                      <Trash2 size={13} />
                      <span>Clear All</span>
                    </button>
                  </div>

                  {rewindPlaylists.map((pl) => {
                    const isExpanded = expandedPlaylistId === pl.id;
                    return (
                      <div key={pl.id} className={`rewind-group-card ${isExpanded ? "rewind-group-expanded" : ""}`}>
                        <div
                          className="rewind-card cursor-pointer"
                          onClick={() => {
                            restoreRewindPlaylist(pl.id, 0);
                            setActiveTab("queue");
                          }}
                          title={`Rewind and play "${pl.seedTitle}" playlist (${pl.trackCount} songs)`}
                        >
                          <div className="rewind-thumb-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pl.thumbnail} alt={pl.seedTitle} className="rewind-thumb" />
                            <div className="rewind-track-pill">
                              <ListMusic size={11} />
                              <span>{pl.trackCount}</span>
                            </div>
                          </div>

                          <div className="rewind-info">
                            <span className="rewind-title" title={pl.seedTitle}>
                              {pl.seedTitle}
                            </span>
                            <span className="rewind-artist">
                              {pl.seedArtist} • {formatRelativeTime(pl.playedAt)}
                            </span>
                            <div className="rewind-sub-actions">
                              <button
                                type="button"
                                className="rewind-toggle-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPlaylistId(isExpanded ? null : pl.id);
                                }}
                                title={isExpanded ? "Hide songs" : "View songs in this playlist"}
                              >
                                <span>{isExpanded ? "Hide songs" : `View songs (${pl.trackCount})`}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </div>
                          </div>

                          <div className="rewind-actions">
                            <button
                              className="item-play-btn"
                              title="Rewind & Play All"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreRewindPlaylist(pl.id, 0);
                                setActiveTab("queue");
                              }}
                            >
                              <Play size={14} color="#ffffff" style={{ marginLeft: "2px" }} />
                            </button>
                            <button
                              className="item-del-btn"
                              title="Remove from Rewind"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRewindPlaylist(pl.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Songs List inside this Playlist */}
                        {isExpanded && (
                          <div className="rewind-songs-list">
                            <div className="rewind-songs-header">
                              <span>Songs in this Playlist ({pl.tracks.length})</span>
                              <span className="rewind-songs-hint">Click any song to play from here</span>
                            </div>
                            {pl.tracks.map((track, tIdx) => (
                              <div
                                key={`${track.id}-${tIdx}`}
                                className="rewind-song-item"
                                onClick={() => {
                                  restoreRewindPlaylist(pl.id, tIdx);
                                  setActiveTab("queue");
                                }}
                                title={`Play "${track.title}"`}
                              >
                                <span className="rewind-song-idx">{tIdx + 1}</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={track.thumbnail || "/music-placeholder.png"}
                                  alt={track.title}
                                  className="rewind-song-thumb"
                                />
                                <div className="rewind-song-details">
                                  <span className="rewind-song-title">{track.title}</span>
                                  <span className="rewind-song-artist">{track.uploader || "YouTube"}</span>
                                </div>
                                <span className="rewind-song-duration">
                                  {track.duration_string || ""}
                                </span>
                                <button
                                  type="button"
                                  className="rewind-song-play-icon"
                                  title="Play"
                                >
                                  <Play size={11} fill="currentColor" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>
  );
}
