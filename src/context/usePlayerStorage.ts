"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Track, LastSessionState, RewindPlaylist } from "./playerTypes";

export function usePlayerStorage() {
  const [history, setHistory] = useState<Track[]>([]);
  const historyRef = useRef<Track[]>(history);
  historyRef.current = history;

  const [rewindPlaylists, setRewindPlaylists] = useState<RewindPlaylist[]>([]);
  const rewindPlaylistsRef = useRef<RewindPlaylist[]>(rewindPlaylists);
  rewindPlaylistsRef.current = rewindPlaylists;

  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [lastSession, setLastSession] = useState<LastSessionState | null>(null);

  const [volume, setVolumeState] = useState<number>(0.85);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(true);
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

  // Persist queue and queueIndex
  useEffect(() => {
    try {
      localStorage.setItem("yt_audio_saved_queue", JSON.stringify(queue));
      localStorage.setItem("yt_audio_queue_index", String(queueIndex));
    } catch {
      // Ignore
    }
  }, [queue, queueIndex]);

  // Save played history to localStorage
  const saveHistoryToStorage = useCallback((updatedHistory: Track[]) => {
    try {
      localStorage.setItem("yt_audio_played_history", JSON.stringify(updatedHistory));
    } catch {
      // Ignore
    }
  }, []);

  // Save last playback session (track, current position, duration, timestamp)
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

  return {
    history,
    setHistory,
    historyRef,
    rewindPlaylists,
    setRewindPlaylists,
    rewindPlaylistsRef,
    queue,
    setQueue,
    queueIndex,
    setQueueIndex,
    lastSession,
    setLastSession,
    volume,
    setVolumeState,
    playbackRate,
    setPlaybackRateState,
    isAutoplay,
    setIsAutoplay,
    saveHistoryToStorage,
    saveSessionToStorage,
  };
}
