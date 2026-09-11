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
import "./page.css";

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

  // Initial home feed — check URL params or default to trending music
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q");
    const catParam = params.get("category");

    if (qParam) {
      setCurrentQuery(qParam);
      setActiveCategory("");
      fetchVideos(qParam);
    } else if (catParam) {
      setActiveCategory(catParam);
      setCurrentQuery(catParam);
      fetchVideos(catParam);
    } else {
      fetchVideos("trending music");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  // Listen for browser Back/Forward navigation to restore previous feed or category
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (e: PopStateEvent) => {
      // If back button was used to dismiss a modal or drawer, don't change feed
      if (e.state?.isModal) return;

      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      const cat = params.get("category");

      if (q) {
        setCurrentQuery(q);
        setActiveCategory("");
        fetchVideos(q);
      } else if (cat) {
        setActiveCategory(cat);
        setCurrentQuery(cat);
        fetchVideos(cat);
      } else {
        setActiveCategory("trending music");
        setCurrentQuery("trending music");
        fetchVideos("trending music");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fetchVideos]);

  // Mobile sidebar back button integration
  const isMobileSidebarPopstateRef = React.useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth > 768) return;

    if (!sidebarCollapsed) {
      window.history.pushState({ isModal: true, modal: "sidebar" }, "");
    } else {
      if (!isMobileSidebarPopstateRef.current && window.history.state?.modal === "sidebar") {
        window.history.back();
      }
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSidebarPop = () => {
      if (window.innerWidth <= 768 && !sidebarCollapsed) {
        isMobileSidebarPopstateRef.current = true;
        setSidebarCollapsed(true);
        setTimeout(() => {
          isMobileSidebarPopstateRef.current = false;
        }, 80);
      }
    };

    window.addEventListener("popstate", handleSidebarPop);
    return () => window.removeEventListener("popstate", handleSidebarPop);
  }, [sidebarCollapsed]);

  // Warm personalized recommendations when listen history IDs actually change
  useEffect(() => {
    if (history.length >= 2) {
      fetchRecommended(false);
    }
  }, [historySeedKey, history.length, fetchRecommended]);

  const handleSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCurrentQuery(trimmed);
    setActiveCategory("");
    fetchVideos(trimmed);
    if (typeof window !== "undefined") {
      const url = `/?q=${encodeURIComponent(trimmed)}`;
      window.history.pushState({ type: "feed", query: trimmed, category: "" }, "", url);
    }
  };

  const handleCategorySelect = (query: string) => {
    if (query === FOR_YOU_QUERY && history.length < 2) {
      // Not enough history yet — fall back to trending
      setActiveCategory("trending music");
      setCurrentQuery("trending music");
      fetchVideos("trending music");
      if (typeof window !== "undefined") {
        window.history.pushState({ type: "feed", query: "trending music", category: "trending music" }, "", "/");
      }
      return;
    }
    setActiveCategory(query);
    setCurrentQuery(query);
    fetchVideos(query);
    if (typeof window !== "undefined") {
      const url = query === "trending music" ? "/" : `/?category=${encodeURIComponent(query)}`;
      window.history.pushState({ type: "feed", query, category: query }, "", url);
    }
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

    </div>
  );
}
