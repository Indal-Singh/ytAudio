"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SeoNavbar } from "@/components/SeoNavbar";
import "./cutter.css";

import {
  SearchResult,
  VideoQuality,
  CutterFormat,
  extractYouTubeId,
} from "./types";
import { CutterHeader } from "./components/CutterHeader";
import { CutterSearch } from "./components/CutterSearch";
import { CutterPlayer } from "./components/CutterPlayer";
import { CutterTimelineTrimmer } from "./components/CutterTimelineTrimmer";
import { CutterExportPanel } from "./components/CutterExportPanel";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function CutterPage() {
  // Input & search state
  const [inputQuery, setInputQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active Video State
  const [videoId, setVideoId] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [videoAuthor, setVideoAuthor] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isEmbedRestricted, setIsEmbedRestricted] = useState(false);

  // Player & Timeline State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(30);
  const [isPreviewingTrim, setIsPreviewingTrim] = useState<boolean>(false);

  // Export Settings State
  const [format, setFormat] = useState<CutterFormat>("mp4");
  const [quality, setQuality] = useState<string>("1080");
  const [bitrate, setBitrate] = useState<string>("320");
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>([
    { height: 1080, label: "1080p Full HD", hasAudio: true, ext: "mp4" },
    { height: 720, label: "720p HD", hasAudio: true, ext: "mp4" },
    { height: 480, label: "480p Standard", hasAudio: true, ext: "mp4" },
    { height: 360, label: "360p Data Saver", hasAudio: true, ext: "mp4" },
  ]);

  // Cut & Processing State
  const [isCutting, setIsCutting] = useState(false);
  const [cutProgress, setCutProgress] = useState(0);
  const [cutStageMessage, setCutStageMessage] = useState("");
  const [cutDownloadUrl, setCutDownloadUrl] = useState<string | null>(null);
  const [cutError, setCutError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isPreviewingRef = useRef(false);
  const startTimeRef = useRef(0);
  const endTimeRef = useRef(30);
  const videoDurationRef = useRef(0);
  const lastSyncTimeRef = useRef(0);
  const lastSyncTimestampRef = useRef(0);

  // Keep refs in sync for postMessage listener and animation loop
  useEffect(() => {
    isPreviewingRef.current = isPreviewingTrim;
  }, [isPreviewingTrim]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    endTimeRef.current = endTime;
  }, [endTime]);

  useEffect(() => {
    videoDurationRef.current = videoDuration;
  }, [videoDuration]);

  // YouTube IFrame PostMessage Communication
  const sendIframeCommand = useCallback((func: string, args: unknown[] = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch {}
    }
  }, []);

  const seekPlayer = useCallback(
    (seconds: number) => {
      const maxDur = videoDurationRef.current || 99999;
      const valid = Math.max(0, Math.min(seconds, maxDur));
      setCurrentTime(valid);
      lastSyncTimeRef.current = valid;
      lastSyncTimestampRef.current = Date.now();

      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        try {
          ytPlayerRef.current.seekTo(valid, true);
        } catch {
          sendIframeCommand("seekTo", [valid, true]);
        }
      } else {
        sendIframeCommand("seekTo", [valid, true]);
      }
    },
    [sendIframeCommand]
  );

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          sendIframeCommand("pauseVideo");
        }
      } else {
        sendIframeCommand("pauseVideo");
      }
    } else {
      setIsPlaying(true);
      lastSyncTimeRef.current = currentTime;
      lastSyncTimestampRef.current = Date.now();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === "function") {
        try {
          ytPlayerRef.current.playVideo();
        } catch {
          sendIframeCommand("playVideo");
        }
      } else {
        sendIframeCommand("setPlaybackQuality", ["hd1080"]);
        sendIframeCommand("setPlaybackQualityRange", ["hd1080", "hd1080"]);
        sendIframeCommand("playVideo");
      }
    }
  }, [isPlaying, currentTime, sendIframeCommand]);

  const initYTPlayer = useCallback(() => {
    if (typeof window === "undefined" || !window.YT || !window.YT.Player) return;
    try {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }

      const iframe = document.getElementById("cutter-yt-iframe");
      if (!iframe) return;

      ytPlayerRef.current = new window.YT.Player("cutter-yt-iframe", {
        events: {
          onReady: (event: any) => {
            try {
              event.target.setPlaybackQuality("hd1080");
            } catch {}
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
              lastSyncTimestampRef.current = Date.now();
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
            }
          },
        },
      });
    } catch {}
  }, []);

  const handleIframeLoad = useCallback(() => {
    sendIframeCommand("listening");
    sendIframeCommand("setPlaybackQuality", ["hd1080"]);
    sendIframeCommand("setPlaybackQualityRange", ["hd1080", "hd1080"]);
    initYTPlayer();
  }, [sendIframeCommand, initYTPlayer]);

  // Load YouTube IFrame API script tag once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      initYTPlayer();
    };
  }, [initYTPlayer]);

  // Handle postMessage events from YouTube IFrame
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data) return;

        // Detect embed restrictions or playback blocks
        if (data.event === "onError" || data.info?.errorCode) {
          const errCode = data.info?.errorCode ?? data.data;
          if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2) {
            setIsEmbedRestricted(true);
          }
        }

        // Detect onStateChange
        if (data.event === "onStateChange") {
          const state = data.info !== undefined ? data.info : data.data;
          if (state === 1) {
            setIsPlaying(true);
            lastSyncTimestampRef.current = Date.now();
          } else if (state === 2 || state === 0) {
            setIsPlaying(false);
          }
        }

        if (data.event === "infoDelivery" && data.info) {
          if (typeof data.info.playerState === "number") {
            if (data.info.playerState === 1) {
              setIsPlaying(true);
              lastSyncTimestampRef.current = Date.now();
            } else if (data.info.playerState === 2 || data.info.playerState === 0) {
              setIsPlaying(false);
            }
          }

          if (typeof data.info.currentTime === "number" && !isNaN(data.info.currentTime)) {
            const cur = data.info.currentTime;
            setCurrentTime(cur);
            lastSyncTimeRef.current = cur;
            lastSyncTimestampRef.current = Date.now();

            if (isPreviewingRef.current && cur >= endTimeRef.current) {
              seekPlayer(startTimeRef.current);
            }
          }

          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setVideoDuration((prev) => {
              if (prev !== data.info.duration) {
                if (endTimeRef.current >= prev - 2 || endTimeRef.current === 30) {
                  const newEnd = Math.min(data.info.duration, 60);
                  setEndTime(newEnd);
                }
                return data.info.duration;
              }
              return prev;
            });
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [seekPlayer]);

  // Smooth real-time playhead advancement loop (updates seekbar needle at 60fps)
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let accurateTime: number | null = null;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === "number" && !isNaN(t) && t >= 0) {
            accurateTime = t;
          }
        } catch {}
      }

      if (accurateTime !== null) {
        lastSyncTimeRef.current = accurateTime;
        setCurrentTime(accurateTime);

        if (isPreviewingRef.current && accurateTime >= endTimeRef.current) {
          seekPlayer(startTimeRef.current);
        }
      } else {
        setCurrentTime((prev) => {
          const next = prev + delta;
          const maxDur = videoDurationRef.current || 99999;
          if (next >= maxDur) {
            setIsPlaying(false);
            return maxDur;
          }
          if (isPreviewingRef.current && next >= endTimeRef.current) {
            seekPlayer(startTimeRef.current);
            return startTimeRef.current;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, seekPlayer]);

  // Cancel any active cut process and reset cut UI
  const cancelCutProcess = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {}
      eventSourceRef.current = null;
    }
    setIsCutting(false);
    setCutProgress(0);
    setCutStageMessage("");
    setCutDownloadUrl(null);
    setCutError(null);
  }, []);

  // Whenever format, quality, bitrate, or time boundaries change,
  // automatically reset any finished/ready download or in-flight process
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    cancelCutProcess();
  }, [format, quality, bitrate, startTime, endTime, cancelCutProcess]);

  // Load Video by ID or URL
  const loadVideo = useCallback(
    async (id: string, title?: string, author?: string, durationSec?: number) => {
      cancelCutProcess();
      setVideoId(id);
      setIsLoadingVideo(true);
      setIsEmbedRestricted(false);
      setIsPreviewingTrim(false);
      setIsPlaying(false);
      setStartTime(0);
      setCurrentTime(0);
      lastSyncTimeRef.current = 0;
      lastSyncTimestampRef.current = Date.now();

      if (title) setVideoTitle(title);
      if (author) setVideoAuthor(author);
      if (durationSec && durationSec > 0) {
        setVideoDuration(durationSec);
        setEndTime(Math.min(durationSec, 30));
      } else {
        setEndTime(30);
      }

      // Fetch format options and accurate metadata
      try {
        const [metaRes, formatsRes] = await Promise.allSettled([
          fetch(`/api/stream?id=${encodeURIComponent(id)}`).then((r) => r.json()),
          fetch(`/api/cut?action=formats&id=${encodeURIComponent(id)}`).then((r) => r.json()),
        ]);

        if (metaRes.status === "fulfilled" && metaRes.value?.success) {
          const meta = metaRes.value;
          if (meta.title) setVideoTitle(meta.title);
          if (meta.uploader || meta.channel) setVideoAuthor(meta.uploader || meta.channel);
          if (meta.duration && meta.duration > 0) {
            setVideoDuration(meta.duration);
            setEndTime((prev) => (prev === 30 ? Math.min(meta.duration, 60) : prev));
          }
        }

        if (formatsRes.status === "fulfilled" && formatsRes.value?.success) {
          const fmts = formatsRes.value.qualities;
          if (Array.isArray(fmts) && fmts.length > 0) {
            setAvailableQualities(fmts);
            // Default to highest available quality
            const highestFmt = fmts.reduce(
              (max: VideoQuality, curr: VideoQuality) => (curr.height > max.height ? curr : max),
              fmts[0]
            );
            setQuality(String(highestFmt.height));
          }
        }
      } catch (err) {
        console.warn("Failed to query full video format details:", err);
      } finally {
        setIsLoadingVideo(false);
      }
    },
    [cancelCutProcess]
  );

  // Fetch live suggestions as user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = inputQuery.trim();
    if (!trimmed || extractYouTubeId(trimmed) || /^https?:\/\//i.test(trimmed)) {
      debounceTimerRef.current = setTimeout(() => {
        setSuggestions([]);
        setShowSuggestions(false);
      }, 0);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputQuery]);

  // Click outside to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Execute Search or Load Video by URL
  const executeSearch = useCallback(
    async (queryText: string) => {
      const clean = queryText.trim();
      if (!clean) return;

      setInputQuery(clean);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);

      const directId = extractYouTubeId(clean);
      if (directId) {
        setSearchResults([]);
        setHasSearched(false);
        loadVideo(directId);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}&limit=12`);
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchError(data.error || "No videos found.");
        }
      } catch {
        setSearchError("Failed to fetch search results. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [loadVideo]
  );

  const handleSearchOrLoad = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      executeSearch(suggestions[selectedSuggestionIndex]);
    } else {
      executeSearch(inputQuery);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Preview Trim Mode
  const handleTogglePreviewTrim = () => {
    if (isPreviewingTrim) {
      setIsPreviewingTrim(false);
      sendIframeCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      setIsPreviewingTrim(true);
      seekPlayer(startTime);
      sendIframeCommand("playVideo");
      setIsPlaying(true);
    }
  };

  // Timeline & Time Controls
  const handleSetStartToNow = () => {
    const newStart = Math.min(currentTime, Math.max(0, endTime - 0.5));
    setStartTime(newStart);
  };

  const handleSetEndToNow = () => {
    const newEnd = Math.max(currentTime, startTime + 0.5);
    setEndTime(Math.min(newEnd, videoDuration));
  };

  const handleResetTrim = () => {
    setStartTime(0);
    setEndTime(videoDuration > 0 ? videoDuration : 30);
    seekPlayer(0);
  };

  // Start Section Cutting & Export via SSE
  const handleStartCut = () => {
    if (!videoId) {
      setCutError("Please search for or enter a YouTube video to cut.");
      return;
    }
    if (isCutting) return;
    if (startTime >= endTime) {
      setCutError("Start time must be before end time.");
      return;
    }

    setIsCutting(true);
    setCutError(null);
    setCutDownloadUrl(null);
    setCutProgress(0);
    setCutStageMessage("Connecting to YouTube...");

    const url = `/api/cut?action=start&id=${encodeURIComponent(videoId)}&start=${startTime.toFixed(
      1
    )}&end=${endTime.toFixed(1)}&format=${format}&quality=${quality}&bitrate=${bitrate}&title=${encodeURIComponent(
      videoTitle
    )}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.progress !== undefined) {
          setCutProgress(data.progress);
        }
        if (data.message) {
          setCutStageMessage(data.message);
        }
        if (data.stage === "ready" && data.downloadUrl) {
          setCutDownloadUrl(data.downloadUrl);
          setIsCutting(false);
          eventSource.close();
        } else if (data.stage === "error") {
          setCutError(data.message || "Trimming failed.");
          setIsCutting(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setCutError("Connection lost or server error during trimming.");
      setIsCutting(false);
      eventSource.close();
    };
  };

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const cutDuration = Math.max(0, endTime - startTime);

  return (
    <div className="cutter-root">
      <SeoNavbar activePage="features" />
      <div className="cutter-bg-glow" />

      <main className="cutter-container">
        {/* Header Title Section */}
        <CutterHeader />

        {/* Search & URL Input Section + Results */}
        <CutterSearch
          inputQuery={inputQuery}
          setInputQuery={setInputQuery}
          isSearching={isSearching}
          searchResults={searchResults}
          hasSearched={hasSearched}
          setHasSearched={setHasSearched}
          searchError={searchError}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          selectedSuggestionIndex={selectedSuggestionIndex}
          setSelectedSuggestionIndex={setSelectedSuggestionIndex}
          searchWrapRef={searchWrapRef}
          executeSearch={executeSearch}
          handleSearchOrLoad={handleSearchOrLoad}
          handleInputKeyDown={handleInputKeyDown}
          loadVideo={loadVideo}
        />

        {/* Main Studio Grid: Video Player + Trimmer Timeline & Settings */}
        <div className="cutter-studio-grid">
          {/* Left Column: Video Player & Timeline */}
          <div className="cutter-studio-left">
            <CutterPlayer
              videoId={videoId}
              videoTitle={videoTitle}
              videoAuthor={videoAuthor}
              videoDuration={videoDuration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isLoadingVideo={isLoadingVideo}
              isEmbedRestricted={isEmbedRestricted}
              setIsEmbedRestricted={setIsEmbedRestricted}
              iframeRef={iframeRef}
              handleIframeLoad={handleIframeLoad}
              togglePlayPause={togglePlayPause}
              seekPlayer={seekPlayer}
              onChangeVideo={() => {
                cancelCutProcess();
                setVideoId("");
                setVideoTitle("");
                setVideoAuthor("");
                setVideoDuration(0);
              }}
              loadVideo={loadVideo}
              executeSearch={executeSearch}
              setInputQuery={setInputQuery}
            />

            <CutterTimelineTrimmer
              videoId={videoId}
              videoDuration={videoDuration}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime}
              setStartTime={setStartTime}
              setEndTime={setEndTime}
              isPreviewingTrim={isPreviewingTrim}
              handleTogglePreviewTrim={handleTogglePreviewTrim}
              handleSetStartToNow={handleSetStartToNow}
              handleSetEndToNow={handleSetEndToNow}
              handleResetTrim={handleResetTrim}
              seekPlayer={seekPlayer}
            />
          </div>

          {/* Right Column: Export Settings & Download */}
          <div className="cutter-studio-right">
            <CutterExportPanel
              videoId={videoId}
              format={format}
              setFormat={setFormat}
              quality={quality}
              setQuality={setQuality}
              bitrate={bitrate}
              setBitrate={setBitrate}
              availableQualities={availableQualities}
              startTime={startTime}
              endTime={endTime}
              cutDuration={cutDuration}
              isCutting={isCutting}
              cutProgress={cutProgress}
              cutStageMessage={cutStageMessage}
              cutDownloadUrl={cutDownloadUrl}
              cutError={cutError}
              cancelCutProcess={cancelCutProcess}
              handleStartCut={handleStartCut}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
