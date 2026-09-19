"use client";

import React from "react";
import { Scissors } from "lucide-react";

export function CutterHeader() {
  return (
    <header className="cutter-header">
      <div className="cutter-badge-pill">
        <Scissors size={14} />
        <span>Precision Video & Audio Trimmer</span>
      </div>
      <h1 className="cutter-title">YouTube Video Cutter & Downloader</h1>
      <p className="cutter-subtitle">
        Search or paste any YouTube link, preview and scrub with frame-by-frame precision,
        and download clean cuts in HD MP4 or 320kbps MP3 without quality loss.
      </p>
    </header>
  );
}
