"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, RotateCcw, FastForward, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./SponsorToast.css";

function getCategoryLabel(category: string): string {
  switch (category) {
    case "music_offtopic":
      return "Non-Music Intro / Dialogue";
    case "sponsor":
      return "Sponsor Segment";
    case "outro":
      return "Outro / End Screen";
    case "selfpromo":
      return "Self Promotion";
    case "interaction":
      return "Interaction Reminder";
    case "intro":
      return "Intro";
    default:
      return "Unwanted Segment";
  }
}

export function SponsorToast() {
  const {
    sponsorToast,
    undoSponsorSkip,
    dismissSponsorToast,
    activePromptSegment,
    skipCurrentSegment,
    sponsorSettings,
  } = usePlayer();

  // If there's an active auto-skip toast
  if (sponsorToast) {
    const label = getCategoryLabel(sponsorToast.category);
    return (
      <div className="sponsor-toast-container glass-panel animate-toast-slide">
        <div className="sponsor-toast-left">
          <div className="sponsor-toast-icon-box auto-skip">
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <div className="sponsor-toast-body">
            <span className="sponsor-toast-title">Skipped {label}</span>
            <span className="sponsor-toast-sub">
              Saved ~{Math.round(sponsorToast.durationSkipped)}s
            </span>
          </div>
        </div>

        <div className="sponsor-toast-actions">
          <button
            type="button"
            className="sponsor-undo-btn"
            onClick={undoSponsorSkip}
            title="Undo and resume from previous position"
          >
            <RotateCcw size={13} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            className="sponsor-dismiss-btn"
            onClick={dismissSponsorToast}
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // If in manual prompt mode and currently inside a segment
  if (activePromptSegment && !sponsorSettings.autoSkip && sponsorSettings.enabled) {
    const label = getCategoryLabel(activePromptSegment.category);
    const segDuration = Math.round(
      activePromptSegment.segment[1] - activePromptSegment.segment[0]
    );

    return (
      <div className="sponsor-toast-container manual-prompt glass-panel animate-toast-slide">
        <div className="sponsor-toast-left">
          <div className="sponsor-toast-icon-box prompt">
            <ShieldAlert size={16} color="#f59e0b" />
          </div>
          <div className="sponsor-toast-body">
            <span className="sponsor-toast-title">{label} detected</span>
            <span className="sponsor-toast-sub">~{segDuration}s remaining</span>
          </div>
        </div>

        <div className="sponsor-toast-actions">
          <button
            type="button"
            className="sponsor-skip-btn"
            onClick={skipCurrentSegment}
            title="Skip this segment"
          >
            <FastForward size={14} />
            <span>Skip</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
