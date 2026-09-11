"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { songFingerprint } from "@/lib/related";

/** Mobile browsers need playsInline + no Web Audio hijack for continuous playback. */
function isMobileClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
  );
}

export interface Track {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  audioUrl?: string;
  url?: string;
  format?: string;
  lastPosition?: number;
  playedAt?: number;
}

export interface LastSessionState {
  track: Track;
  position: number;
  duration: number;
  timestamp: number;
}

export interface RewindPlaylist {
  id: string;
  seedId: string;
  title: string;
  seedTitle: string;
  seedArtist: string;
  thumbnail: string;
  trackCount: number;
  tracks: Track[];
  playedAt: number;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  /** Prefer usePlayerTime() — kept off the hot path so cards don't re-render every tick. */
  getCurrentTime: () => number;
  subscribeTime: (listener: (t: number) => void) => () => void;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isLooping: boolean;
  isShuffling: boolean;
  queue: Track[];
  /** Index of the currently playing track inside `queue` (-1 if none). */
  queueIndex: number;
  history: Track[];
  rewindPlaylists: RewindPlaylist[];
  restoreRewindPlaylist: (id: string, startIndex?: number) => Promise<void>;
  removeRewindPlaylist: (id: string) => void;
  clearRewindPlaylists: () => void;
  lastSession: LastSessionState | null;
  showVisualizer: boolean;
  showDirectModal: boolean;
  showQueueDrawer: boolean;
  showVideoModal: boolean;
  showDownloadModal: boolean;
  downloadTrack: Track | null;
  error: string | null;
  analyser: AnalyserNode | null;
  playTrack: (
    track: Track,
    startTime?: number,
    options?: { fromQueue?: boolean }
  ) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  resumeLastSession: () => Promise<void>;
  dismissLastSession: () => void;
  togglePlay: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  syncTimeAndPlay: (seconds: number, autoPlay?: boolean) => void;
  seek: (seconds: number) => void;
  skipBy: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  isAutoplay: boolean;
  toggleAutoplay: () => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (track: Track) => void;
  addToPlayNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  clearHistory: () => void;
  setShowVisualizer: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowDirectModal: (val: boolean) => void;
  setShowQueueDrawer: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowVideoModal: (val: boolean) => void;
  setShowDownloadModal: (val: boolean) => void;
  openDownloadModal: (track?: Track) => void;
  playDirectUrl: (urlOrId: string) => Promise<void>;
  isFindingRelated: boolean;
  loadMoreRelatedSongs: () => Promise<void>;
}

type PlaybackStatus = {
  currentId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
};

type PlayerActions = {
  playTrack: (
    track: Track,
    startTime?: number,
    options?: { fromQueue?: boolean }
  ) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  togglePlay: () => void;
  addToQueue: (track: Track) => void;
  addToPlayNext: (track: Track) => void;
  openDownloadModal: (track?: Track) => void;
};


const PlayerContext = createContext<PlayerContextType | null>(null);
const PlaybackStatusContext = createContext<PlaybackStatus>({
  currentId: null,
  isPlaying: false,
  isLoading: false,
});
const PlayerActionsContext = createContext<PlayerActions | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(true);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [history, setHistory] = useState<Track[]>([]);
  const historyRef = useRef<Track[]>(history);
  historyRef.current = history;
  const [rewindPlaylists, setRewindPlaylists] = useState<RewindPlaylist[]>([]);
  const rewindPlaylistsRef = useRef<RewindPlaylist[]>(rewindPlaylists);
  rewindPlaylistsRef.current = rewindPlaylists;
  const currentSeedTrackRef = useRef<Track | null>(null);
  const [lastSession, setLastSession] = useState<LastSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFindingRelated, setIsFindingRelated] = useState<boolean>(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // Load history, rewind playlists, queue, lastSession, and playback prefs from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("yt_audio_played_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }

      const savedRewind = localStorage.getItem("yt_audio_rewind_playlists");
      if (savedRewind) {
        const parsed = JSON.parse(savedRewind);
        if (Array.isArray(parsed)) {
          setRewindPlaylists(parsed);
        }
      }

      const savedQueue = localStorage.getItem("yt_audio_saved_queue");
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue);
        if (Array.isArray(parsed)) {
          setQueue(parsed);
        }
      }

      const savedQueueIndex = localStorage.getItem("yt_audio_queue_index");
      if (savedQueueIndex != null) {
        const idx = parseInt(savedQueueIndex, 10);
        if (!isNaN(idx)) setQueueIndex(idx);
      }

      const savedSession = localStorage.getItem("yt_audio_last_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.track && parsed.position > 1) {
          setLastSession(parsed);
        }
      }

      const savedPrefs = localStorage.getItem("yt_audio_player_prefs");
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (typeof prefs.volume === "number") {
          setVolumeState(Math.max(0, Math.min(1, prefs.volume)));
        }
        if (typeof prefs.playbackRate === "number") {
          setPlaybackRateState(prefs.playbackRate);
        }
        if (typeof prefs.isAutoplay === "boolean") {
          setIsAutoplay(prefs.isAutoplay);
        }
      }
    } catch {
      // LocalStorage unavailable or corrupted
    } finally {
      setPrefsHydrated(true);
    }
  }, []);

  // Persist volume / rate / autoplay
  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem(
        "yt_audio_player_prefs",
        JSON.stringify({
          volume,
          playbackRate,
          isAutoplay,
        })
      );
    } catch {
      // Ignore
    }
  }, [volume, playbackRate, isAutoplay, prefsHydrated]);

  // Save played history to localStorage whenever it changes
  const saveHistoryToStorage = (updatedHistory: Track[]) => {
    try {
      localStorage.setItem("yt_audio_played_history", JSON.stringify(updatedHistory));
    } catch {
      // Ignore
    }
  };

  // Save last playback session (track, current position, duration, timestamp)
  // Periodic saves write localStorage only — avoid React re-renders every few seconds.
  const saveSessionToStorage = useCallback((track: Track, position: number, dur: number, syncReact = false) => {
    if (!track || position < 1) return;
    try {
      const sessionData: LastSessionState = {
        track,
        position,
        duration: dur,
        timestamp: Date.now(),
      };
      localStorage.setItem("yt_audio_last_session", JSON.stringify(sessionData));

      // Patch history positions in storage without forcing a full UI re-render
      try {
        const raw = localStorage.getItem("yt_audio_played_history");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((t: Track) =>
              t.id === track.id ? { ...t, lastPosition: position, playedAt: Date.now() } : t
            );
            localStorage.setItem("yt_audio_played_history", JSON.stringify(updated));
            historyRef.current = updated;
          }
        }
      } catch {
        // Ignore history patch errors
      }

      if (syncReact) {
        setLastSession(sessionData);
        setHistory((prev) => {
          const updated = prev.map((t) =>
            t.id === track.id ? { ...t, lastPosition: position, playedAt: Date.now() } : t
          );
          return updated;
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save queue + playlist cursor to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("yt_audio_saved_queue", JSON.stringify(queue));
      localStorage.setItem("yt_audio_queue_index", String(queueIndex));
    } catch {
      // Ignore
    }
  }, [queue, queueIndex]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay((prev) => !prev);
  }, []);

  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;

  const queueIndexRef = useRef<number>(queueIndex);
  queueIndexRef.current = queueIndex;

  const currentTrackRef = useRef<Track | null>(currentTrack);
  currentTrackRef.current = currentTrack;

  const isLoopingRef = useRef<boolean>(isLooping);
  isLoopingRef.current = isLooping;

  const isShufflingRef = useRef<boolean>(isShuffling);
  isShufflingRef.current = isShuffling;

  const isAutoplayRef = useRef<boolean>(isAutoplay);
  isAutoplayRef.current = isAutoplay;

  const playNextRef = useRef<() => void>(() => {});
  const lastSaveTimeRef = useRef<number>(0);
  const autoQueueFetchingRef = useRef<string | null>(null); // tracks which videoId we're fetching for
  /** Song ended before related tracks arrived — play next as soon as queue grows. */
  const pendingAutoNextRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const timeListenersRef = useRef<Set<(t: number) => void>>(new Set());
  const prefetchedIdsRef = useRef<Set<string>>(new Set());
  const prefetchedUrlsRef = useRef<Map<string, string>>(new Map());
  const prefetchingIdRef = useRef<string | null>(null);
  const durationRef = useRef<number>(0);
  durationRef.current = duration;

  const notifyTime = useCallback((t: number) => {
    currentTimeRef.current = t;
    timeListenersRef.current.forEach((listener) => listener(t));
  }, []);

  const getCurrentTime = useCallback(() => currentTimeRef.current, []);

  const subscribeTime = useCallback((listener: (t: number) => void) => {
    timeListenersRef.current.add(listener);
    listener(currentTimeRef.current);
    return () => {
      timeListenersRef.current.delete(listener);
    };
  }, []);

  /** Warm server yt-dlp cache for the upcoming queue item (no React state). */
  const prefetchTrackStream = useCallback((track: Track | undefined | null) => {
    if (!track?.id) return;
    if (prefetchedIdsRef.current.has(track.id)) return;
    if (prefetchingIdRef.current === track.id) return;
    if (currentTrackRef.current?.id === track.id) return;

    prefetchingIdRef.current = track.id;
    fetch(`/api/stream?id=${encodeURIComponent(track.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          prefetchedIdsRef.current.add(track.id);
          if (typeof data.audioUrl === "string") {
            prefetchedUrlsRef.current.set(track.id, data.audioUrl);
          }
        }
      })
      .catch(() => {
        // Prefetch is best-effort
      })
      .finally(() => {
        if (prefetchingIdRef.current === track.id) {
          prefetchingIdRef.current = null;
        }
      });
  }, []);

  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);
  const [showDirectModal, setShowDirectModal] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [downloadTrack, setDownloadTrack] = useState<Track | null>(null);

  const openDownloadModal = useCallback((track?: Track) => {
    setDownloadTrack(track || currentTrack);
    setShowDownloadModal(true);
  }, [currentTrack]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Initialize Web Audio API node on user interaction (desktop only — mobile routes silence through suspended contexts)
  const initWebAudio = useCallback(() => {
    if (isMobileClient()) return;
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const node = ctx.createAnalyser();
      node.fftSize = 128;
      node.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(node);
      node.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = node;
      sourceNodeRef.current = source;
      setAnalyser(node);
    } catch {
      // Audio element cross-origin security restriction or already connected
    }
  }, []);

  // Setup audio element listeners — keep element in DOM for iOS/Android background play
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.preload = "auto";
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.setAttribute("x-webkit-airplay", "allow");
    audio.crossOrigin = "anonymous";
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;

    // First gesture unlocks future play() / AudioContext resume on mobile
    const unlock = () => {
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });

    const handleTimeUpdate = () => {
      const t = audio.currentTime;
      notifyTime(t);

      // Periodically persist playback position every 3 seconds to localStorage
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 3000 && currentTrackRef.current && t > 1) {
        lastSaveTimeRef.current = now;
        saveSessionToStorage(currentTrackRef.current, Math.floor(t), audio.duration || 0);
      }

      // Prefetch next playlist item near the end of the current track
      const dur = audio.duration || durationRef.current;
      if (dur > 0 && t / dur >= 0.7) {
        const next = queueRef.current[queueIndexRef.current + 1];
        prefetchTrackStream(next);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      if (currentTrackRef.current && audio.currentTime > 1) {
        saveSessionToStorage(
          currentTrackRef.current,
          Math.floor(audio.currentTime),
          audio.duration || 0,
          true
        );
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handleEnded = () => {
      // Clean up session if finished
      try {
        localStorage.removeItem("yt_audio_last_session");
        setLastSession(null);
      } catch {
        // Ignore
      }

      if (isLoopingRef.current) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          notifyTime(0);
          void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
        return;
      }

      if (!isAutoplayRef.current) {
        setIsPlaying(false);
        return;
      }

      const list = queueRef.current;
      const idx = queueIndexRef.current;
      const hasNext = idx >= 0 && idx + 1 < list.length;

      if (hasNext || (isShufflingRef.current && list.length > 1)) {
        // Call synchronously from `ended` so mobile browsers allow the next play()
        playNextRef.current();
      } else {
        // Related fetch may still be in flight — keep waiting for queue growth
        pendingAutoNextRef.current = true;
        setIsPlaying(false);
        setIsLoading(true);
      }
    };

    const handleError = () => {
      console.warn("Audio playback error encountered on", audio.src);
      setIsLoading(false);
      setIsPlaying(false);
      setError("Playback error: unable to stream audio.");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
      audio.removeAttribute("src");
      audio.load();
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [saveSessionToStorage, notifyTime, prefetchTrackStream]);

  // Save or update playlist in Rewind Playlist history
  const saveRewindPlaylist = useCallback((seedTrack: Track, tracks: Track[]) => {
    if (!seedTrack?.id || !tracks || tracks.length === 0) return;
    setRewindPlaylists((prev) => {
      const existing = prev.find((p) => p.seedId === seedTrack.id);
      const newEntry: RewindPlaylist = {
        id: existing?.id || `rewind_${Date.now()}_${seedTrack.id}`,
        seedId: seedTrack.id,
        title: seedTrack.title,
        seedTitle: seedTrack.title,
        seedArtist: seedTrack.uploader || "YouTube",
        thumbnail: seedTrack.thumbnail,
        trackCount: tracks.length,
        tracks: [...tracks],
        playedAt: Date.now(),
      };
      const filtered = prev.filter((p) => p.seedId !== seedTrack.id);
      const updated = [newEntry, ...filtered].slice(0, 30);
      try {
        localStorage.setItem("yt_audio_rewind_playlists", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Fetch related/similar songs and add them to the queue
  const fetchRelatedSongs = useCallback(async (track: Track, isReset = false, isAppendMore = false) => {
    // Don't fetch if we're already fetching for this track (unless forced by reset or appendMore)
    if (!isReset && !isAppendMore && autoQueueFetchingRef.current === track.id) return;
    autoQueueFetchingRef.current = track.id;
    setIsFindingRelated(true);

    try {
      const params = new URLSearchParams({
        title: track.title || "",
        artist: track.uploader || "",
        currentId: track.id,
        limit: "25",
      });
      const res = await fetch(`/api/related?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        setQueue((prevQueue) => {
          // If this was from an outside reset, ensure user hasn't switched to another track
          if (isReset && currentTrackRef.current?.id !== track.id) {
            return prevQueue;
          }

          // When NOT a reset and NOT appendMore, only append if cursor is near end of playlist (<= 3 songs remaining)
          if (!isReset && !isAppendMore) {
            const cursor = queueIndexRef.current;
            const upcomingCount =
              prevQueue.length === 0 ? 0 : Math.max(0, prevQueue.length - cursor - 1);
            if (upcomingCount > 3) return prevQueue;
          }

          const recentHistory = historyRef.current;

          const existingIds = new Set([
            ...prevQueue.map((t) => t.id),
            track.id,
            ...recentHistory.map((t) => t.id),
          ]);

          // Block alternate versions of songs already playing / recently played / queued
          const existingFingerprints = new Set(
            [
              songFingerprint(track.title, track.uploader),
              ...prevQueue.map((t) => songFingerprint(t.title, t.uploader)),
              ...recentHistory.slice(0, 20).map((t) => songFingerprint(t.title, t.uploader)),
            ].filter(Boolean)
          );

          const newTracks: Track[] = [];
          for (const v of data.results as Array<{
            id: string;
            title: string;
            uploader: string;
            duration: number;
            duration_string: string;
            thumbnail: string;
            url: string;
          }>) {
            if (existingIds.has(v.id)) continue;
            const fp = songFingerprint(v.title, v.uploader);
            if (fp && existingFingerprints.has(fp)) continue;
            existingIds.add(v.id);
            if (fp) existingFingerprints.add(fp);
            newTracks.push({
              id: v.id,
              title: v.title,
              uploader: v.uploader,
              duration: v.duration,
              duration_string: v.duration_string,
              thumbnail: v.thumbnail,
              url: v.url,
            });
          }

          if (newTracks.length === 0) return prevQueue;

          const updatedQueue = [...prevQueue, ...newTracks];
          queueRef.current = updatedQueue;
          const seed = currentSeedTrackRef.current || track;
          saveRewindPlaylist(seed, updatedQueue);
          return updatedQueue;
        });
      }
    } catch (err) {
      console.warn("Failed to fetch related songs:", err);
    } finally {
      if (autoQueueFetchingRef.current === track.id) {
        autoQueueFetchingRef.current = null;
      }
      setIsFindingRelated(false);
    }
  }, [saveRewindPlaylist]);

  // Explicitly load more related songs (e.g., when scrolling to bottom of queue drawer)
  const loadMoreRelatedSongs = useCallback(async () => {
    const list = queueRef.current;
    if (list.length === 0 || isFindingRelated) return;
    // Use last track or current track as seed for finding next recommendations
    const seedTrack = list[list.length - 1] || currentTrackRef.current;
    if (!seedTrack) return;
    await fetchRelatedSongs(seedTrack, false, true);
  }, [fetchRelatedSongs, isFindingRelated]);

  const playTrack = useCallback(
    async (
      track: Track,
      startTime?: number,
      options?: { fromQueue?: boolean }
    ) => {
      setError(null);
      setIsLoading(true);
      pendingAutoNextRef.current = false;

      const isFromQueue = options?.fromQueue ?? false;

      try {
        const enriched: Track = { ...track };
        const startAt =
          typeof startTime === "number" ? Math.max(0, startTime) : track.lastPosition || 0;

        if (isFromQueue) {
          // PLAYING FROM PLAYLIST:
          // Playlist & related songs do NOT reset. Cursor simply moves to the selected track.
          const prevQueue = queueRef.current;
          const existingIdx = prevQueue.findIndex((t) => t.id === enriched.id);
          if (existingIdx >= 0) {
            queueIndexRef.current = existingIdx;
            setQueueIndex(existingIdx);
          } else {
            const next = [...prevQueue, enriched];
            const newIdx = next.length - 1;
            queueIndexRef.current = newIdx;
            setQueueIndex(newIdx);
            queueRef.current = next;
            setQueue(next);
            if (currentTrackRef.current) {
              saveRewindPlaylist(currentTrackRef.current, next);
            }
          }
        } else {
          // PLAYING FROM OUTSIDE (search results, home feed, recommended cards, etc.):
          // Reset playlist with this newly selected song as track 0
          currentSeedTrackRef.current = enriched;
          queueIndexRef.current = 0;
          setQueueIndex(0);
          queueRef.current = [enriched];
          setQueue([enriched]);
          saveRewindPlaylist(enriched, [enriched]);

          // Immediately fetch fresh recommendations for this new song
          autoQueueFetchingRef.current = null;
          void fetchRelatedSongs(enriched, true);
        }


        currentTrackRef.current = enriched;
        setCurrentTrack(enriched);
        setDuration(enriched.duration || 0);
        notifyTime(startAt);

        const audio = audioRef.current;
        if (audio) {
          const warmUrl =
            enriched.audioUrl || prefetchedUrlsRef.current.get(enriched.id);
          const proxyAudioSrc = warmUrl
            ? `/api/proxy?id=${encodeURIComponent(enriched.id)}&url=${encodeURIComponent(warmUrl)}`
            : `/api/proxy?id=${encodeURIComponent(enriched.id)}`;

          // Start media ASAP — critical for mobile continued play after `ended`
          audio.src = proxyAudioSrc;
          audio.playbackRate = playbackRate;
          audio.volume = isMuted ? 0 : volume;

          if (startAt > 0) {
            const seekOnce = () => {
              try {
                audio.currentTime = startAt;
              } catch {
                // Ignore seek until buffered
              }
            };
            audio.addEventListener("loadedmetadata", seekOnce, { once: true });
          }

          try {
            // Do not call audio.load() here — it can break the mobile play() chain
            await audio.play();
            if (!isMobileClient()) {
              initWebAudio();
              if (audioContextRef.current?.state === "suspended") {
                void audioContextRef.current.resume();
              }
            }
          } catch (playErr) {
            console.warn("Autoplay was prevented or postponed:", playErr);
          }
        }

        // Add to history and persist to localStorage
        const trackWithMeta: Track = {
          ...enriched,
          lastPosition: startAt,
          playedAt: Date.now(),
        };

        setHistory((prev) => {
          const filtered = prev.filter((t) => t.id !== enriched.id);
          const updated = [trackWithMeta, ...filtered].slice(0, 50);
          saveHistoryToStorage(updated);
          return updated;
        });

        // Save last session
        saveSessionToStorage(trackWithMeta, startAt, enriched.duration || 0, true);

        // Warm the next playlist item
        const nextTrack = queueRef.current[queueIndexRef.current + 1];
        prefetchTrackStream(nextTrack);
      } catch (err: unknown) {
        console.error("Play error:", err);
        const msg = err instanceof Error ? err.message : "Could not play audio";
        setError(msg);
        setIsLoading(false);
      }
    },
    [initWebAudio, playbackRate, isMuted, volume, saveSessionToStorage, notifyTime, prefetchTrackStream, fetchRelatedSongs]
  );

  const playFromQueue = useCallback(
    async (index: number) => {
      const list = queueRef.current;
      if (index < 0 || index >= list.length) return;
      const target = list[index];
      await playTrack(target, 0, { fromQueue: true });
    },
    [playTrack]
  );

  const restoreRewindPlaylist = useCallback(
    async (playlistId: string, startIndex: number = 0) => {
      const pl = rewindPlaylistsRef.current.find((p) => p.id === playlistId);
      if (!pl || pl.tracks.length === 0) return;
      currentSeedTrackRef.current = pl.tracks[0] || null;
      const targetTracks = [...pl.tracks];
      const validIndex = Math.max(0, Math.min(startIndex, targetTracks.length - 1));
      queueRef.current = targetTracks;
      setQueue(targetTracks);
      queueIndexRef.current = validIndex;
      setQueueIndex(validIndex);
      try {
        localStorage.setItem("yt_audio_saved_queue", JSON.stringify(targetTracks));
        localStorage.setItem("yt_audio_queue_index", String(validIndex));
      } catch {
        // Ignore
      }
      await playTrack(targetTracks[validIndex], 0, { fromQueue: true });
    },
    [playTrack]
  );

  const removeRewindPlaylist = useCallback((playlistId: string) => {
    setRewindPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== playlistId);
      try {
        localStorage.setItem("yt_audio_rewind_playlists", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const clearRewindPlaylists = useCallback(() => {
    setRewindPlaylists([]);
    try {
      localStorage.removeItem("yt_audio_rewind_playlists");
    } catch {
      // Ignore
    }
  }, []);



  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    initWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.error("Resume error:", e));
    }
  }, [isPlaying, currentTrack, initWebAudio]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const resumeAudio = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    initWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((e) => console.warn("Resume audio error:", e));
  }, [currentTrack, initWebAudio]);

  const syncTimeAndPlay = useCallback(
    (seconds: number, autoPlay: boolean = true) => {
      if (!audioRef.current || !currentTrack) return;
      const validTime = Math.max(
        0,
        isNaN(seconds) || !isFinite(seconds) ? 0 : seconds
      );
      try {
        audioRef.current.currentTime = validTime;
        notifyTime(validTime);
      } catch (e) {
        console.warn("Error setting audio currentTime:", e);
      }

      if (autoPlay) {
        if (!isMobileClient()) {
          initWebAudio();
          if (audioContextRef.current?.state === "suspended") {
            void audioContextRef.current.resume();
          }
        }
        // Closing video modal is a user gesture — play() should succeed on mobile
        const attempt = () =>
          audioRef.current
            ?.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.warn("Autoplay sync error:", e));

        attempt();
        // iOS sometimes needs a second tick after iframe releases audio focus
        if (isMobileClient()) {
          window.setTimeout(attempt, 120);
        }
      }
    },
    [currentTrack, initWebAudio, notifyTime]
  );

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    notifyTime(seconds);
  }, [notifyTime]);

  const skipBy = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const target = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration || Infinity));
      seek(target);
    },
    [duration, seek]
  );

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(val, 1));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffling((prev) => !prev);
  }, []);

  // Auto-queue: proactively fetch and append more related songs when playlist is nearing end (<= 3 upcoming songs)
  useEffect(() => {
    if (!isAutoplay) return;
    const upcoming = Math.max(0, queue.length - queueIndex - 1);
    if (queue.length === 0 || upcoming <= 3) {
      // Pick seed track: prefer the last track in queue, or current playing track
      const seedTrack = (queue.length > 0 ? queue[queue.length - 1] : null) || currentTrackRef.current;
      if (seedTrack?.id) {
        fetchRelatedSongs(seedTrack, false, upcoming > 0);
      }
    }
  }, [currentTrack?.id, isAutoplay, queue.length, queueIndex, fetchRelatedSongs]);

  // If a track ended while related was still loading, start next when queue fills
  useEffect(() => {
    if (!pendingAutoNextRef.current || !isAutoplay) return;
    const next = queueRef.current[queueIndexRef.current + 1];
    if (!next) return;
    pendingAutoNextRef.current = false;
    void playTrack(next, 0, { fromQueue: true });
  }, [queue.length, queueIndex, isAutoplay, playTrack]);

  const playNext = useCallback(() => {
    const list = queueRef.current;
    const idx = queueIndexRef.current;

    if (list.length === 0) {
      if (isLoopingRef.current && currentTrackRef.current) {
        seek(0);
        audioRef.current?.play().catch(() => {});
      } else {
        setIsPlaying(false);
      }
      return;
    }

    let nextIndex = idx + 1;
    if (isShufflingRef.current && list.length > 1) {
      const candidates = list.map((_, i) => i).filter((i) => i !== idx);
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)] ?? idx;
    }

    if (nextIndex >= 0 && nextIndex < list.length) {
      playTrack(list[nextIndex], 0, { fromQueue: true });
    } else if (isLoopingRef.current) {
      // Restart playlist from the beginning
      playTrack(list[0], 0, { fromQueue: true });
    } else {
      pendingAutoNextRef.current = true;
      setIsPlaying(false);
      setIsLoading(true);
    }
  }, [playTrack, seek]);

  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    if (currentTimeRef.current > 3) {
      seek(0);
      return;
    }
    const list = queueRef.current;
    const idx = queueIndexRef.current;
    if (idx > 0 && list[idx - 1]) {
      playTrack(list[idx - 1], 0, { fromQueue: true });
    } else {
      seek(0);
    }
  }, [playTrack, seek]);


  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const addToPlayNext = useCallback((track: Track) => {
    setQueue((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === track.id);
      let cursor = queueIndexRef.current;
      let working = prev;

      if (existingIdx >= 0) {
        working = prev.filter((t) => t.id !== track.id);
        if (existingIdx < cursor) {
          cursor -= 1;
          queueIndexRef.current = cursor;
          setQueueIndex(cursor);
        } else if (existingIdx === cursor) {
          // Moving the current track as "play next" — keep it current
          return prev;
        }
      }

      const next = [...working];
      const at = Math.min(Math.max(cursor + 1, 0), next.length);
      next.splice(at, 0, track);
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.filter((_, i) => i !== index);
      const cursor = queueIndexRef.current;
      if (index < cursor) {
        const newIdx = cursor - 1;
        queueIndexRef.current = newIdx;
        setQueueIndex(newIdx);
      } else if (index === cursor) {
        // Removed currently playing — clamp cursor; playback continues until next skip
        const newIdx = Math.min(cursor, next.length - 1);
        queueIndexRef.current = newIdx;
        setQueueIndex(newIdx);
      }
      return next;
    });
  }, []);

  const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Keep cursor glued to the same track id
      const currentId = currentTrackRef.current?.id;
      if (currentId) {
        const newIdx = updated.findIndex((t) => t.id === currentId);
        if (newIdx >= 0) {
          queueIndexRef.current = newIdx;
          setQueueIndex(newIdx);
        }
      } else {
        let cursor = queueIndexRef.current;
        if (fromIndex === cursor) cursor = toIndex;
        else if (fromIndex < cursor && toIndex >= cursor) cursor -= 1;
        else if (fromIndex > cursor && toIndex <= cursor) cursor += 1;
        queueIndexRef.current = cursor;
        setQueueIndex(cursor);
      }
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    // Keep the currently playing track as the sole playlist item
    const current = currentTrackRef.current;
    if (current) {
      setQueue([current]);
      setQueueIndex(0);
      queueIndexRef.current = 0;
    } else {
      setQueue([]);
      setQueueIndex(-1);
      queueIndexRef.current = -1;
    }
    try {
      localStorage.removeItem("yt_audio_saved_queue");
      localStorage.removeItem("yt_audio_queue_index");
    } catch {
      // Ignore
    }
  }, []);

  const playDirectUrl = useCallback(
    async (urlOrId: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stream?id=${encodeURIComponent(urlOrId)}`);
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load audio from link");
        }
        const track: Track = {
          id: data.id,
          title: data.title,
          uploader: data.uploader,
          duration: data.duration,
          duration_string: data.duration_string,
          thumbnail: data.thumbnail,
          audioUrl: data.audioUrl,
          format: data.format,
        };
        await playTrack(track);
        setShowDirectModal(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unable to play provided URL";
        setError(msg);
        setIsLoading(false);
      }
    },
    [playTrack]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem("yt_audio_played_history");
    } catch {
      // Ignore
    }
  }, []);

  const resumeLastSession = useCallback(async () => {
    if (!lastSession || !lastSession.track) return;
    await playTrack(lastSession.track, lastSession.position, { fromQueue: true });
  }, [lastSession, playTrack]);

  const dismissLastSession = useCallback(() => {
    setLastSession(null);
    try {
      localStorage.removeItem("yt_audio_last_session");
    } catch {
      // Ignore
    }
  }, []);

  // Prefetch next playlist item when the upcoming track id changes
  const nextTrackId = queue[queueIndex + 1]?.id;
  useEffect(() => {
    if (!currentTrack?.id) return;
    const next = queueRef.current[queueIndexRef.current + 1];
    prefetchTrackStream(next);
  }, [currentTrack?.id, nextTrackId, prefetchTrackStream]);

  // Media Session API — lock screen / headset controls
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    if (!currentTrack) {
      try {
        navigator.mediaSession.metadata = null;
      } catch {
        // Ignore
      }
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.uploader,
        artwork: currentTrack.thumbnail
          ? [
              { src: currentTrack.thumbnail, sizes: "320x180", type: "image/jpeg" },
              { src: currentTrack.thumbnail, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
    } catch {
      // MediaMetadata unsupported quirks
    }

    const bind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions unsupported on this platform
      }
    };

    bind("play", () => {
      audioRef.current?.play().catch(() => {});
    });
    bind("pause", () => {
      audioRef.current?.pause();
    });
    bind("previoustrack", () => playPrev());
    bind("nexttrack", () => playNext());
    bind("seekbackward", (details) => {
      skipBy(-(details.seekOffset || 10));
    });
    bind("seekforward", (details) => {
      skipBy(details.seekOffset || 10);
    });
    bind("seekto", (details) => {
      if (typeof details.seekTime === "number") seek(details.seekTime);
    });

    return () => {
      bind("play", null);
      bind("pause", null);
      bind("previoustrack", null);
      bind("nexttrack", null);
      bind("seekbackward", null);
      bind("seekforward", null);
      bind("seekto", null);
    };
  }, [currentTrack, playNext, playPrev, seek, skipBy]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore
    }
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(duration, 0),
        playbackRate: playbackRate || 1,
        position: Math.min(Math.max(currentTimeRef.current, 0), Math.max(duration, 0)),
      });
    } catch {
      // Ignore unsupported position state
    }
  }, [currentTrack, duration, playbackRate, isPlaying]);

  // Global keyboard shortcuts (ignore when typing in inputs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipBy(e.shiftKey ? -30 : -10);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        skipBy(e.shiftKey ? 30 : 10);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        playNext();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        playPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, skipBy, playNext, playPrev]);

  const actionsValue = useMemo<PlayerActions>(
    () => ({
      playTrack,
      playFromQueue,
      togglePlay,
      addToQueue,
      addToPlayNext,
      openDownloadModal,
    }),
    [playTrack, playFromQueue, togglePlay, addToQueue, addToPlayNext, openDownloadModal]
  );

  const playbackStatus = useMemo<PlaybackStatus>(
    () => ({
      currentId: currentTrack?.id ?? null,
      isPlaying,
      isLoading,
    }),
    [currentTrack?.id, isPlaying, isLoading]
  );

  return (
    <PlayerActionsContext.Provider value={actionsValue}>
      <PlaybackStatusContext.Provider value={playbackStatus}>
        <PlayerContext.Provider
          value={{
            currentTrack,
            isPlaying,
            isLoading,
            getCurrentTime,
            subscribeTime,
            duration,
            volume,
            isMuted,
            playbackRate,
            isLooping,
            isShuffling,
            queue,
            queueIndex,
            history,
            rewindPlaylists,
            restoreRewindPlaylist,
            removeRewindPlaylist,
            clearRewindPlaylists,
            lastSession,
            showVisualizer,
            showDirectModal,
            showQueueDrawer,
            showVideoModal,
            showDownloadModal,
            downloadTrack,
            error,
            analyser,
            playTrack,
            playFromQueue,

            resumeLastSession,
            dismissLastSession,
            togglePlay,
            pauseAudio,
            resumeAudio,
            syncTimeAndPlay,
            seek,
            skipBy,
            setVolume,
            toggleMute,
            setPlaybackRate,
            toggleLoop,
            toggleShuffle,
            isAutoplay,
            toggleAutoplay,

            playNext,
            playPrev,
            addToQueue,
            addToPlayNext,
            removeFromQueue,
            moveInQueue,
            clearQueue,
            clearHistory,
            setShowVisualizer,
            setShowDirectModal,
            setShowQueueDrawer,
            setShowVideoModal,
            setShowDownloadModal,
            openDownloadModal,
            playDirectUrl,
            isFindingRelated,
            loadMoreRelatedSongs,
          }}
        >
          {children}
        </PlayerContext.Provider>
      </PlaybackStatusContext.Provider>
    </PlayerActionsContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}

/** Stable actions for grid cards — avoids queue/history re-renders. */
export function usePlayerActions() {
  const context = useContext(PlayerActionsContext);
  if (!context) {
    throw new Error("usePlayerActions must be used within a PlayerProvider");
  }
  return context;
}

/** Per-card playback highlight without full player context. */
export function useTrackCardState(trackId: string) {
  const { currentId, isPlaying, isLoading } = useContext(PlaybackStatusContext);
  const isCurrent = currentId === trackId;
  return {
    isCurrent,
    isCardPlaying: isCurrent && isPlaying,
    isCardLoading: isCurrent && isLoading,
  };
}

/** Subscribe to playback clock without re-rendering the whole app tree. */
export function usePlayerTime() {
  const { subscribeTime } = usePlayer();
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => subscribeTime(setCurrentTime), [subscribeTime]);

  return currentTime;
}
