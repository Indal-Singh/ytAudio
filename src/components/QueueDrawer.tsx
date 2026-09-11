"use client";

import React, { useState, useRef } from "react";
import { X, Trash2, Play, ListMusic, RotateCcw, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

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

      <style jsx>{`
        .queue-overlay {
          position: fixed;
          inset: 0;
          z-index: 1500;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .drawer-panel {
          width: 100%;
          max-width: 420px;
          height: 100%;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.7);
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .tabs-row {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-base);
          padding: 4px;
          border-radius: var(--radius-full);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 500;
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .tab-active {
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-weight: 600;
        }

        .close-drawer-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-hover);
        }

        .close-drawer-btn:hover {
          color: #ffffff;
          background: var(--yt-red);
        }

        .now-playing-box {
          padding: 16px 20px;
          background: rgba(255, 0, 51, 0.08);
          border-bottom: 1px solid var(--border-subtle);
        }

        .now-playing-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--yt-red);
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }

        .now-track-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .now-thumb {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          border: 1px solid var(--border-subtle);
        }

        .now-info {
          min-width: 0;
          flex: 1;
        }

        .now-title {
          font-size: 0.88rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .now-artist {
          font-size: 0.76rem;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .empty-state {
          height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.88rem;
        }

        .empty-state span {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .upcoming-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .upcoming-count-badge {
          background: var(--bg-hover);
          color: var(--text-secondary);
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: var(--radius-full);
          font-family: var(--font-mono);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .autoplay-pill-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .autoplay-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          transition: all 0.2s ease;
        }

        .autoplay-active {
          background: rgba(0, 240, 255, 0.12);
          border-color: rgba(0, 240, 255, 0.35);
          color: var(--accent-cyan);
        }

        .autoplay-active .autoplay-dot {
          background: var(--accent-cyan);
          box-shadow: 0 0 6px var(--accent-cyan);
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .clear-btn:hover {
          color: var(--yt-red);
          background: rgba(255, 0, 51, 0.1);
        }

        .swipe-hint {
          font-size: 0.66rem;
          color: var(--text-muted);
          text-align: center;
          padding: 0 0 4px;
          opacity: 0.6;
        }

        .finding-related-banner {
          font-size: 0.72rem;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          text-align: center;
          margin-bottom: 4px;
          animation: pulseGlow 1.8s infinite ease-in-out;
        }

        .bottom-loading-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          font-size: 0.74rem;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.06);
          border: 1px dashed rgba(0, 240, 255, 0.25);
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }

        .bottom-loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 8px var(--accent-cyan);
          animation: pulseGlow 1.2s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        /* ── Queue track item ── */
        .track-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--radius-md);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.15s ease;
          user-select: none;
          position: relative;
        }

        .track-played {
          opacity: 0.55;
        }

        .track-played .item-title {
          color: var(--text-secondary);
        }

        .track-current {
          opacity: 1;
          background: rgba(255, 0, 51, 0.12);
          border-color: rgba(255, 0, 51, 0.45);
          box-shadow: 0 0 16px rgba(255, 0, 51, 0.15);
        }

        .track-current .item-title {
          color: #ffffff;
          font-weight: 700;
        }

        .item-index {
          width: 18px;
          flex-shrink: 0;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
          text-align: center;
        }

        .finding-related-banner {
          font-size: 0.78rem;
          color: var(--accent-cyan);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 240, 255, 0.08);
          border: 1px dashed rgba(0, 240, 255, 0.25);
          text-align: center;
        }

        .track-item:hover {
          background: var(--bg-hover);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .track-dragging {
          background: var(--bg-active) !important;
          border-color: var(--accent-cyan) !important;
          z-index: 10;
        }

        /* Drag handle */
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: grab;
          flex-shrink: 0;
          padding: 4px 0;
          touch-action: none;
          transition: color 0.15s ease;
        }

        .drag-handle:hover {
          color: var(--text-primary);
        }

        .drag-handle:active {
          cursor: grabbing;
          color: var(--accent-cyan);
        }

        /* Thumbnail */
        .item-thumb {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          flex-shrink: 0;
        }

        .thumb-container {
          position: relative;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .thumb-container .item-thumb {
          width: 100%;
          height: 100%;
        }

        .thumb-progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(0, 0, 0, 0.6);
        }

        .thumb-progress-fill {
          height: 100%;
          background: var(--yt-red);
          border-radius: 2px;
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-title {
          font-size: 0.82rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .item-artist {
          font-size: 0.72rem;
          color: var(--text-muted);
          display: block;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
        }

        .history-resume-tag {
          display: inline-flex;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
          font-family: var(--font-mono);
        }

        .history-duration-tag {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .item-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }

        .item-play-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--yt-red);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
          flex-shrink: 0;
        }

        .item-play-btn:hover {
          transform: scale(1.1);
        }

        .item-del-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .item-del-btn:hover {
          color: var(--yt-red);
          background: rgba(255, 0, 51, 0.15);
        }

        /* ── Rewind Playlist card ── */
        .rewind-group-card {
          border-radius: var(--radius-md);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .rewind-group-card.rewind-group-expanded {
          border-color: rgba(0, 240, 255, 0.45);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.55), 0 0 15px rgba(0, 240, 255, 0.1);
        }

        .rewind-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: transparent;
          transition: background-color 0.15s ease;
          position: relative;
        }

        .rewind-card:hover {
          background: var(--bg-hover);
        }

        .rewind-thumb-wrap {
          position: relative;
          width: 50px;
          height: 50px;
          min-width: 50px;
          min-height: 50px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-base);
          flex-shrink: 0;
        }

        .rewind-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rewind-track-pill {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(4px);
          color: var(--accent-cyan);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .rewind-info {
          flex: 1;
          min-width: 0;
        }

        .rewind-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .rewind-artist {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .rewind-sub-actions {
          margin-top: 4px;
          display: flex;
          align-items: center;
        }

        .rewind-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.22);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rewind-toggle-btn:hover {
          background: rgba(0, 240, 255, 0.18);
          border-color: var(--accent-cyan);
          transform: translateY(-1px);
        }

        .rewind-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        /* Expandable list of songs */
        .rewind-songs-list {
          border-top: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.35);
          max-height: 290px;
          overflow-y: auto;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .rewind-songs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px 6px;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .rewind-songs-hint {
          font-size: 0.64rem;
          color: var(--accent-cyan);
          text-transform: none;
          letter-spacing: normal;
          opacity: 0.85;
        }

        .rewind-song-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color 0.15s ease, transform 0.1s ease;
          border: 1px solid transparent;
        }

        .rewind-song-item:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(0, 240, 255, 0.25);
          transform: translateX(2px);
        }

        .rewind-song-idx {
          font-size: 0.68rem;
          color: var(--text-muted);
          width: 16px;
          text-align: right;
          flex-shrink: 0;
        }

        .rewind-song-thumb {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 4px;
          object-fit: cover;
          background: var(--bg-base);
          flex-shrink: 0;
        }

        .rewind-song-details {
          flex: 1;
          min-width: 0;
        }

        .rewind-song-title {
          display: block;
          font-size: 0.76rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rewind-song-artist {
          display: block;
          font-size: 0.66rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rewind-song-duration {
          font-size: 0.68rem;
          color: var(--text-muted);
          margin-right: 4px;
          flex-shrink: 0;
        }

        .rewind-song-play-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 240, 255, 0.15);
          color: var(--accent-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .rewind-song-item:hover .rewind-song-play-icon {
          background: var(--accent-cyan);
          color: #000;
          transform: scale(1.1);
        }

        .cursor-pointer {
          cursor: pointer;
        }


        @media (max-width: 500px) {
          .drawer-panel {
            max-width: 100%;
          }
          .drawer-header {
            padding: 14px 16px;
          }
          .drawer-body {
            padding: 12px 14px;
          }
        }
      `}</style>
    </div>
  );
}
