"use client";

import { useEffect, MutableRefObject } from "react";
import type { Track } from "./playerTypes";

interface UsePlayerMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  duration: number;
  playbackRate: number;
  currentTimeRef: MutableRefObject<number>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  playNext: () => void;
  playPrev: () => void;
  seek: (seconds: number) => void;
  skipBy: (seconds: number) => void;
}

export function usePlayerMediaSession({
  currentTrack,
  isPlaying,
  duration,
  playbackRate,
  currentTimeRef,
  audioRef,
  playNext,
  playPrev,
  seek,
  skipBy,
}: UsePlayerMediaSessionProps) {
  // Media Session API — lock screen / headset controls metadata and action handlers
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
  }, [currentTrack, playNext, playPrev, seek, skipBy, audioRef]);

  // Sync playback state (playing / paused)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore
    }
  }, [isPlaying]);

  // Sync position state (scrub bar on mobile lock screen)
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
  }, [currentTrack, duration, playbackRate, isPlaying, currentTimeRef]);
}
