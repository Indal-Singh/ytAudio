"use client";

import { useEffect } from "react";

interface UsePlayerKeyboardProps {
  togglePlay: () => void;
  skipBy: (seconds: number) => void;
  playNext: () => void;
  playPrev: () => void;
}

export function usePlayerKeyboard({
  togglePlay,
  skipBy,
  playNext,
  playPrev,
}: UsePlayerKeyboardProps) {
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
}
