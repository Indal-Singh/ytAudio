"use client";

import React from "react";
import { usePlayer } from "@/context/PlayerContext";

interface TopLoaderProps {
  active?: boolean;
}

export function TopLoader({ active = false }: TopLoaderProps) {
  const { isLoading } = usePlayer();
  const shouldShow = active || isLoading;

  if (!shouldShow) return null;

  return (
    <div className="top-loader-container" role="progressbar" aria-label="Loading">
      <div className="top-loader-bar" />
      <style jsx>{`
        .top-loader-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          z-index: 99999;
          background: rgba(255, 0, 51, 0.15);
          overflow: hidden;
          pointer-events: none;
        }

        .top-loader-bar {
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--yt-red) 30%,
            #ff4d6d 60%,
            var(--accent-cyan) 85%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: laserSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 12px var(--yt-red-glow), 0 0 6px var(--accent-cyan);
        }

        @keyframes laserSlide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
