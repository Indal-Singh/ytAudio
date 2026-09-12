"use client";

import React, { useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  FastForward,
  Hand,
  Music,
  Megaphone,
  LogOut,
  ShoppingBag,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./SponsorModal.css";

function formatSeconds(secs: number): string {
  if (isNaN(secs) || !isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function SponsorModal() {
  const {
    showSponsorModal,
    setShowSponsorModal,
    sponsorSettings,
    updateSponsorSettings,
    sponsorSegments,
    currentTrack,
  } = usePlayer();

  // Escape key to close
  useEffect(() => {
    if (!showSponsorModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSponsorModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSponsorModal, setShowSponsorModal]);

  if (!showSponsorModal) return null;

  return (
    <div
      className="sponsor-modal-backdrop"
      onClick={() => setShowSponsorModal(false)}
    >
      <div
        className="sponsor-modal-card glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-modal-title"
      >
        {/* Header */}
        <div className="sponsor-modal-header">
          <div className="sponsor-header-title-box">
            <div className="sponsor-header-icon">
              <ShieldCheck size={22} color="#10b981" />
            </div>
            <div>
              <h3 id="sponsor-modal-title" className="sponsor-title">
                SponsorBlock Controls
              </h3>
              <p className="sponsor-subtitle">
                Skip sponsor reads, dialogues & unwanted intros
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sponsor-close-btn"
            onClick={() => setShowSponsorModal(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sponsor-modal-body">
          {/* Master Enable / Disable */}
          <div className="sponsor-master-row">
            <div className="sponsor-master-info">
              <span className="sponsor-master-label">Enable SponsorBlock</span>
              <span className="sponsor-master-sub">
                Crowdsourced YouTube segment skipping
              </span>
            </div>
            <button
              type="button"
              className={`sponsor-switch ${sponsorSettings.enabled ? "active" : ""}`}
              onClick={() =>
                updateSponsorSettings({ enabled: !sponsorSettings.enabled })
              }
              role="switch"
              aria-checked={sponsorSettings.enabled}
            >
              <div className="sponsor-switch-knob" />
            </button>
          </div>

          {sponsorSettings.enabled && (
            <>
              {/* Skip Behavior Mode */}
              <div className="sponsor-section">
                <span className="sponsor-section-title">Skip Mode</span>
                <div className="sponsor-mode-grid">
                  <div
                    className={`sponsor-mode-card ${
                      sponsorSettings.autoSkip ? "selected" : ""
                    }`}
                    onClick={() => updateSponsorSettings({ autoSkip: true })}
                  >
                    <div className="sponsor-mode-icon">
                      <FastForward size={18} />
                    </div>
                    <div className="sponsor-mode-text">
                      <strong>Auto-Skip</strong>
                      <span>Automatically skips segments</span>
                    </div>
                    {sponsorSettings.autoSkip && (
                      <Check size={16} className="mode-check" />
                    )}
                  </div>

                  <div
                    className={`sponsor-mode-card ${
                      !sponsorSettings.autoSkip ? "selected" : ""
                    }`}
                    onClick={() => updateSponsorSettings({ autoSkip: false })}
                  >
                    <div className="sponsor-mode-icon">
                      <Hand size={18} />
                    </div>
                    <div className="sponsor-mode-text">
                      <strong>Manual Prompt</strong>
                      <span>Shows a &ldquo;Skip&rdquo; button</span>
                    </div>
                    {!sponsorSettings.autoSkip && (
                      <Check size={16} className="mode-check" />
                    )}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="sponsor-section">
                <span className="sponsor-section-title">Categories to Skip</span>
                <div className="sponsor-categories-list">
                  {/* Non-Music Offtopic */}
                  <label className="sponsor-cat-row">
                    <div className="cat-label-box">
                      <Music size={16} className="cat-icon music-cat" />
                      <div>
                        <span className="cat-title">
                          Music Video Intro / Non-Music Dialogue
                        </span>
                        <span className="cat-desc">
                          Skips story scenes, dialogues before music starts
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sponsorSettings.skipMusicOfftopic}
                      onChange={(e) =>
                        updateSponsorSettings({
                          skipMusicOfftopic: e.target.checked,
                        })
                      }
                      className="cat-checkbox"
                    />
                  </label>

                  {/* Sponsor */}
                  <label className="sponsor-cat-row">
                    <div className="cat-label-box">
                      <Megaphone size={16} className="cat-icon sponsor-cat" />
                      <div>
                        <span className="cat-title">Sponsor Reads</span>
                        <span className="cat-desc">
                          Paid promotions and sponsored segments
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sponsorSettings.skipSponsor}
                      onChange={(e) =>
                        updateSponsorSettings({ skipSponsor: e.target.checked })
                      }
                      className="cat-checkbox"
                    />
                  </label>

                  {/* Outro */}
                  <label className="sponsor-cat-row">
                    <div className="cat-label-box">
                      <LogOut size={16} className="cat-icon outro-cat" />
                      <div>
                        <span className="cat-title">Outros & End Screens</span>
                        <span className="cat-desc">
                          End cards, credits, and channel sign-offs
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sponsorSettings.skipOutro}
                      onChange={(e) =>
                        updateSponsorSettings({ skipOutro: e.target.checked })
                      }
                      className="cat-checkbox"
                    />
                  </label>

                  {/* Self Promo */}
                  <label className="sponsor-cat-row">
                    <div className="cat-label-box">
                      <ShoppingBag size={16} className="cat-icon promo-cat" />
                      <div>
                        <span className="cat-title">Self-Promotion</span>
                        <span className="cat-desc">
                          Merchandise, social handles, channel links
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sponsorSettings.skipSelfpromo}
                      onChange={(e) =>
                        updateSponsorSettings({ skipSelfpromo: e.target.checked })
                      }
                      className="cat-checkbox"
                    />
                  </label>

                  {/* Interaction */}
                  <label className="sponsor-cat-row">
                    <div className="cat-label-box">
                      <BellRing size={16} className="cat-icon interact-cat" />
                      <div>
                        <span className="cat-title">Interaction Reminders</span>
                        <span className="cat-desc">
                          Like, subscribe, and bell notifications
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sponsorSettings.skipInteraction}
                      onChange={(e) =>
                        updateSponsorSettings({
                          skipInteraction: e.target.checked,
                        })
                      }
                      className="cat-checkbox"
                    />
                  </label>
                </div>
              </div>

              {/* Current Track Segments Preview */}
              {currentTrack && (
                <div className="sponsor-section">
                  <span className="sponsor-section-title">
                    Segments in &ldquo;{currentTrack.title.slice(0, 30)}…&rdquo;
                  </span>
                  {sponsorSegments.length > 0 ? (
                    <div className="segments-preview-list">
                      {sponsorSegments.map((seg, i) => (
                        <div key={seg.UUID || i} className="segment-preview-item">
                          <span
                            className={`seg-badge seg-${seg.category.replace(
                              /[^a-z0-9]/gi,
                              "_"
                            )}`}
                          >
                            {seg.category}
                          </span>
                          <span className="seg-time">
                            {formatSeconds(seg.segment[0])} -{" "}
                            {formatSeconds(seg.segment[1])}
                          </span>
                          <span className="seg-dur">
                            ({Math.round(seg.segment[1] - seg.segment[0])}s)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-segments-text">
                      No skippable segments reported for this track.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sponsor-modal-footer">
          <a
            href="https://sponsor.ajay.app"
            target="_blank"
            rel="noopener noreferrer"
            className="sponsor-credit-link"
          >
            <span>Powered by SponsorBlock</span>
            <ExternalLink size={12} />
          </a>
          <button
            type="button"
            className="sponsor-save-btn"
            onClick={() => setShowSponsorModal(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
