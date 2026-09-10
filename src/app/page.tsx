"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { CategoryChips } from "@/components/CategoryChips";
import { AudioCard } from "@/components/AudioCard";
import { PlayerBar } from "@/components/PlayerBar";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { DirectUrlModal } from "@/components/DirectUrlModal";
import { QueueDrawer } from "@/components/QueueDrawer";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { DownloadModal } from "@/components/DownloadModal";
import { TopLoader } from "@/components/TopLoader";
import { usePlayer } from "@/context/PlayerContext";
import { Sparkles, Radio, Music, AlertCircle, RefreshCw, Play, X, Clock } from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  duration_string: string;
  view_count?: number;
  thumbnail: string;
  url: string;
}

const CATEGORIES = [
  { label: "For You", query: "__for_you__" },
  { label: "All", query: "trending music" },
  { label: "Lofi Beats", query: "lofi hip hop radio beats to relax" },
  { label: "Trending Music", query: "top trending songs official audio" },
  { label: "Synthwave", query: "synthwave retrowave mix" },
  { label: "Gaming Beats", query: "gaming music beats" },
  { label: "Chillhop", query: "chillhop instrumental beats" },
  { label: "Acoustic Pop", query: "acoustic pop songs" },
  { label: "Bollywood Hits", query: "trending bollywood hits audio" },
  { label: "Podcasts", query: "popular podcast highlights audio" },
  { label: "Piano & Study", query: "relaxing piano study music" },
];

const FOR_YOU_QUERY = "__for_you__";

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("trending music");
  const [currentQuery, setCurrentQuery] = useState("trending music");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recommended, setRecommended] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerTargetRef = React.useRef<HTMLDivElement | null>(null);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const loadMoreAbortRef = React.useRef<AbortController | null>(null);
  const recommendAbortRef = React.useRef<AbortController | null>(null);
  const recommendFetchedForRef = React.useRef<string>("");

  const {
    currentTrack,
    history,
    lastSession,
    resumeLastSession,
    dismissLastSession,
    showVideoModal,
    setShowVideoModal,
    showDownloadModal,
    setShowDownloadModal,
    downloadTrack,
    openDownloadModal,
  } = usePlayer();

  const historyRef = React.useRef(history);
  historyRef.current = history;

  const isForYou = currentQuery === FOR_YOU_QUERY;
  const showHomeRecs =
    !isForYou &&
    activeCategory === "trending music" &&
    history.length >= 2 &&
    recommended.length > 0;

  // Stable key of recent listen IDs (ignores lastPosition ticks)
  const historySeedKey = history
    .slice(0, 8)
    .map((t) => t.id)
    .join(",");

  useEffect(() => {
    // Only collapse on mobile viewports (< 769px) by default
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  const fetchRecommended = useCallback(async (force = false) => {
    const hist = historyRef.current;
    if (hist.length < 2) {
      setRecommended([]);
      return;
    }

    const seedKey = hist
      .slice(0, 8)
      .map((t) => t.id)
      .join(",");
    if (!force && recommendFetchedForRef.current === seedKey) {
      return;
    }

    recommendAbortRef.current?.abort();
    const controller = new AbortController();
    recommendAbortRef.current = controller;
    setLoadingRecommended(true);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          limit: 16,
          seeds: hist.slice(0, 20).map((t) => ({
            id: t.id,
            title: t.title,
            uploader: t.uploader,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setRecommended(data.results);
        recommendFetchedForRef.current = seedKey;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("Recommend fetch error:", err);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingRecommended(false);
      }
    }
  }, []);

  const fetchVideos = useCallback(async (searchQuery: string) => {
    if (searchQuery === FOR_YOU_QUERY) {
      setLoading(true);
      setError(null);
      setHasMore(false);
      try {
        await fetchRecommended(true);
        setVideos([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoading(true);
    setError(null);
    setHasMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=16&start=1`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }
      setVideos(data.results || []);
      if (!data.results || data.results.length < 8) {
        setHasMore(false);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search fetch error:", err);
      const msg = err instanceof Error ? err.message : "Failed to load videos";
      setError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchRecommended]);

  const loadMoreVideos = useCallback(async () => {
    if (isForYou || loading || loadingMore || !hasMore) return;
    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    setLoadingMore(true);
    try {
      const nextStart = videos.length + 1;
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(currentQuery)}&limit=12&start=${nextStart}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        setVideos((prev) => {
          // Filter duplicates by id
          const existingIds = new Set(prev.map((v) => v.id));
          const newItems = data.results.filter((v: VideoItem) => !existingIds.has(v.id));
          if (newItems.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...newItems];
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("Error loading more videos:", err);
      setHasMore(false);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingMore(false);
      }
    }
  }, [isForYou, loading, loadingMore, hasMore, videos.length, currentQuery]);

  // IntersectionObserver to trigger infinite scroll as soon as user reaches near bottom
  useEffect(() => {
    if (!observerTargetRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadMoreVideos();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0.1,
      }
    );

    observer.observe(observerTargetRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMoreVideos]);

  // Initial home feed — once only (do NOT re-run when callbacks/history change)
  useEffect(() => {
    fetchVideos("trending music");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  // Warm personalized recommendations when listen history IDs actually change
  useEffect(() => {
    if (history.length >= 2) {
      fetchRecommended(false);
    }
  }, [historySeedKey, history.length, fetchRecommended]);

  const handleSearch = (query: string) => {
    setCurrentQuery(query);
    setActiveCategory("");
    fetchVideos(query);
  };

  const handleCategorySelect = (query: string) => {
    if (query === FOR_YOU_QUERY && history.length < 2) {
      // Not enough history yet — fall back to trending
      setActiveCategory("trending music");
      setCurrentQuery("trending music");
      fetchVideos("trending music");
      return;
    }
    setActiveCategory(query);
    setCurrentQuery(query);
    fetchVideos(query);
  };

  const feedTitle = isForYou
    ? "Recommended for you"
    : activeCategory
      ? CATEGORIES.find((c) => c.query === activeCategory)?.label || "Audio Feed"
      : `Results for ${currentQuery}`;

  const feedSubtitle = isForYou
    ? history.length > 0
      ? `Based on artists you play often — like ${[...new Set(history.slice(0, 6).map((t) => t.uploader))].slice(0, 2).join(" & ")}`
      : "Play a few tracks and we’ll personalize this feed"
    : "Search, queue, and stream YouTube as pure audio";

  return (
    <div className="app-shell">
      {/* Top Global YouTube Progress Bar */}
      <TopLoader active={loading} />

      {/* Top Navigation */}
      <Navbar
        onSearch={handleSearch}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="main-layout">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeCategory={activeCategory}
          onSelectCategory={handleCategorySelect}
          onCloseMobile={() => setSidebarCollapsed(true)}
        />

        <main className="content-scrollable">
          {/* Quick Filter Chips */}
          <CategoryChips
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
          />

          <div className="feed-container">
            {/* Resume Last Session Banner */}
            {lastSession && !currentTrack && (
              <div className="resume-session-banner glass-panel">
                <div className="resume-left">
                  <div className="resume-icon-badge">
                    <Clock size={16} color="var(--accent-cyan)" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lastSession.track.thumbnail}
                    alt={lastSession.track.title}
                    className="resume-thumb"
                  />
                  <div className="resume-info">
                    <div className="resume-kicker">CONTINUE LISTENING</div>
                    <div className="resume-title">{lastSession.track.title}</div>
                    <div className="resume-meta">
                      {lastSession.track.uploader} &bull; Left off at{" "}
                      <span className="resume-timestamp">
                        {Math.floor(lastSession.position / 60)}:
                        {Math.floor(lastSession.position % 60) < 10 ? "0" : ""}
                        {Math.floor(lastSession.position % 60)}
                      </span>{" "}
                      / {lastSession.track.duration_string || `${Math.floor(lastSession.duration / 60)}m`}
                    </div>
                  </div>
                </div>

                <div className="resume-actions">
                  <button
                    className="resume-play-btn"
                    onClick={resumeLastSession}
                    title="Resume from last position"
                  >
                    <Play size={15} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
                    <span>Resume</span>
                  </button>
                  <button
                    className="resume-dismiss-btn"
                    onClick={dismissLastSession}
                    title="Dismiss"
                    aria-label="Dismiss banner"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Feed Header Banner */}
            <div className="feed-header">
              <div className="feed-title-box">
                <div className={`feed-icon-circle ${isForYou ? "feed-icon-foryou" : ""}`}>
                  {isForYou ? (
                    <Sparkles size={20} color="#00f0ff" />
                  ) : (
                    <Radio size={20} color="#ff0033" />
                  )}
                </div>
                <div>
                  <h1 className="feed-title">{feedTitle}</h1>
                  <p className="feed-subtitle">{feedSubtitle}</p>
                </div>
              </div>

              <button
                className="refresh-btn"
                onClick={() =>
                  isForYou ? fetchRecommended(true) : fetchVideos(currentQuery)
                }
                disabled={loading || loadingRecommended}
                title="Refresh Results"
              >
                <RefreshCw
                  size={16}
                  className={loading || loadingRecommended ? "spin-icon" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>

            {/* Personalized strip on Home (All) */}
            {showHomeRecs && (
              <section className="for-you-section">
                <div className="for-you-header">
                  <div className="for-you-title-row">
                    <Sparkles size={16} color="#00f0ff" />
                    <h2>Recommended for you</h2>
                  </div>
                  <button
                    className="for-you-see-all"
                    onClick={() => handleCategorySelect(FOR_YOU_QUERY)}
                  >
                    See all
                  </button>
                </div>
                <div className="video-grid for-you-grid">
                  {recommended.slice(0, 8).map((item) => (
                    <AudioCard key={`rec-${item.id}`} video={item} />
                  ))}
                </div>
              </section>
            )}

            {activeCategory === "trending music" &&
              history.length >= 2 &&
              loadingRecommended &&
              recommended.length === 0 && (
                <div className="for-you-loading">
                  <div className="infinite-spinner" />
                  <span>Building picks from your listening history…</span>
                </div>
              )}

            {/* Error Message */}
            {error && (
              <div className="error-card">
                <AlertCircle size={22} color="#ff4d6d" />
                <div className="error-text">
                  <h3>Unable to fetch audio feed</h3>
                  <p>{error}</p>
                </div>
                <button
                  className="retry-btn"
                  onClick={() => fetchVideos(currentQuery)}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Skeleton grid while searching */}
            {loading && (
              <div className="video-grid" aria-busy="true" aria-label="Loading tracks">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-thumb" />
                    <div className="skeleton-details">
                      <div className="skeleton-avatar" />
                      <div className="skeleton-lines">
                        <div className="skeleton-line line-title" />
                        <div className="skeleton-line line-subtitle" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* For You full grid */}
            {!loading && isForYou && (
              <>
                {recommended.length > 0 ? (
                  <div className="video-grid">
                    {recommended.map((item) => (
                      <AudioCard key={item.id} video={item} />
                    ))}
                  </div>
                ) : (
                  <div className="feed-empty-state">
                    <Sparkles size={48} color="var(--text-muted)" />
                    <h2>Not enough listening data yet</h2>
                    <p>Play a few songs, then refresh — we’ll recommend based on your taste.</p>
                  </div>
                )}
              </>
            )}

            {/* Results Grid (search / categories) */}
            {!loading && !error && !isForYou && videos.length > 0 && (
              <>
                {showHomeRecs && (
                  <div className="trending-divider">
                    <span>Trending now</span>
                  </div>
                )}
                <div className="video-grid">
                  {videos.map((item) => (
                    <AudioCard key={item.id} video={item} />
                  ))}
                </div>

                {/* Infinite Scroll Bottom Sentinel & Loader */}
                <div ref={observerTargetRef} className="infinite-scroll-sentinel">
                  {loadingMore && (
                    <div className="infinite-loader-row">
                      <div className="infinite-spinner" />
                      <span>Loading more audio tracks...</span>
                    </div>
                  )}
                  {!hasMore && videos.length > 10 && (
                    <div className="infinite-end-msg">
                      <span>You have reached the end of results</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Empty State */}
            {!loading && !error && !isForYou && videos.length === 0 && (
              <div className="feed-empty-state">
                <Music size={48} color="var(--text-muted)" />
                <h2>No tracks found</h2>
                <p>Try searching for a different song, artist, or genre.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Persistent Bottom Player Bar */}
      <PlayerBar />

      {/* Modals & Drawers */}
      <AudioVisualizer />
      <DirectUrlModal />
      <QueueDrawer />
      <VideoPlayerModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onOpenDownload={() => {
          setShowVideoModal(false);
          openDownloadModal(currentTrack || undefined);
        }}
      />
      <DownloadModal
        track={downloadTrack || currentTrack}
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />

      <style jsx>{`
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-base);
          position: relative;
        }

        .main-layout {
          display: flex;
          flex: 1;
          height: calc(100vh - var(--header-height));
          overflow: hidden;
        }

        .content-scrollable {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding-bottom: calc(var(--player-height) + 24px);
        }

        .feed-container {
          padding: 24px 32px;
          max-width: 1700px;
          width: 100%;
          margin: 0 auto;
        }

        .resume-session-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(18, 20, 26, 0.95), rgba(26, 30, 42, 0.95));
          border: 1px solid rgba(0, 240, 255, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(0, 240, 255, 0.08);
          margin-bottom: 24px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .resume-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .resume-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .resume-thumb {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .resume-info {
          min-width: 0;
        }

        .resume-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--accent-cyan);
          text-transform: uppercase;
        }

        .resume-title {
          font-size: 0.92rem;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 480px;
        }

        .resume-meta {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .resume-timestamp {
          color: var(--accent-cyan);
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .resume-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .resume-play-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          background: var(--yt-red);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(255, 0, 51, 0.35);
        }

        .resume-play-btn:hover {
          background: var(--yt-red-hover);
          transform: scale(1.04);
        }

        .resume-dismiss-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .resume-dismiss-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .feed-title-box {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .feed-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(255, 0, 51, 0.12);
          border: 1px solid rgba(255, 0, 51, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feed-icon-foryou {
          background: rgba(0, 240, 255, 0.1);
          border-color: rgba(0, 240, 255, 0.3);
        }

        .for-you-section {
          margin-bottom: 28px;
        }

        .for-you-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .for-you-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .for-you-title-row h2 {
          font-size: 1.05rem;
          font-weight: 700;
        }

        .for-you-see-all {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--accent-cyan);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          transition: background 0.15s ease;
        }

        .for-you-see-all:hover {
          background: rgba(0, 240, 255, 0.16);
        }

        .for-you-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .trending-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0 18px;
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .trending-divider::before,
        .trending-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        .feed-title {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .feed-subtitle {
          font-size: 0.84rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Simple Loader */
        .simple-loader-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          text-align: center;
        }

        .simple-spinner-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.08);
          border-top-color: var(--yt-red);
          border-right-color: var(--accent-cyan);
          animation: spin 0.75s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          box-shadow: 0 0 20px var(--yt-red-glow);
        }

        .simple-loader-text h3 {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .simple-loader-text p {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px 18px;
        }

        /* Skeletons */
        .skeleton-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-thumb {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-md);
          background: linear-gradient(90deg, #181b22 0%, #222734 50%, #181b22 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-details {
          display: flex;
          gap: 12px;
        }

        .skeleton-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #1e222d;
          flex-shrink: 0;
        }

        .skeleton-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-line {
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(90deg, #181b22 0%, #222734 50%, #181b22 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .line-title {
          width: 85%;
        }

        .line-subtitle {
          width: 50%;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .error-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(255, 0, 51, 0.1);
          border: 1px solid rgba(255, 0, 51, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .error-text {
          flex: 1;
        }

        .error-text h3 {
          font-size: 0.95rem;
          color: #ff4d6d;
        }

        .error-text p {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .retry-btn {
          padding: 8px 16px;
          background: var(--yt-red);
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
        }

        .feed-empty-state {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-secondary);
        }

        .infinite-scroll-sentinel {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 0 16px 0;
        }

        .infinite-loader-row {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 0.88rem;
          font-weight: 500;
          background: rgba(18, 20, 26, 0.7);
          padding: 10px 22px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          animation: fadeIn 0.2s ease;
        }

        .infinite-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.12);
          border-top-color: var(--yt-red);
          border-right-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .infinite-end-msg {
          color: var(--text-muted);
          font-size: 0.82rem;
          padding: 12px 20px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 768px) {
          .feed-container {
            padding: 14px 12px;
          }
          .video-grid {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px 12px;
          }
          .feed-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .feed-title {
            font-size: 1.2rem;
          }
        }

        @media (max-width: 540px) {
          .feed-container {
            padding: 10px;
          }
          .video-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
