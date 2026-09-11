"use client";

import React, { useState } from "react";
import { X, Play, Link2, Sparkles, AlertCircle } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./DirectUrlModal.css";

export function DirectUrlModal() {
  const { showDirectModal, setShowDirectModal, playDirectUrl, isLoading, error } = usePlayer();
  const [urlInput, setUrlInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!showDirectModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setLocalError("Please enter a valid YouTube URL or Video ID");
      return;
    }
    setLocalError(null);
    try {
      await playDirectUrl(urlInput.trim());
    } catch {
      // error handled in context
    }
  };

  const presets = [
    {
      title: "Lofi Girl - Study Session",
      id: "lTRiuFIWV54",
    },
    {
      title: "Synthwave Radio Mix",
      id: "4xDzrJKXOOY",
    },
    {
      title: "Interstellar Main Theme",
      id: "UDVtMYqUAyw",
    },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <div className="modal-title-box">
            <Link2 size={20} color="#ff0033" />
            <h3 className="modal-title">Play from YouTube Link</h3>
          </div>
          <button
            className="close-icon-btn"
            onClick={() => setShowDirectModal(false)}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-description">
            Paste any YouTube video URL, Short, or 11-digit Video ID. YTaudio will extract the audio and start playback right away.
          </p>

          <div className="input-field-group">
            <input
              type="text"
              className="url-input"
              placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setLocalError(null);
              }}
              autoFocus
            />
            <button
              type="submit"
              className="submit-play-btn"
              disabled={isLoading || !urlInput.trim()}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <Play size={16} color="#ffffff" style={{ marginLeft: "2px" }} />
                  <span>Play Audio</span>
                </>
              )}
            </button>
          </div>

          {(localError || error) && (
            <div className="error-badge">
              <AlertCircle size={16} />
              <span>{localError || error}</span>
            </div>
          )}

          <div className="presets-section">
            <div className="presets-label">
              <Sparkles size={14} color="#00f0ff" />
              <span>Or try one of these quick audio streams:</span>
            </div>
            <div className="preset-buttons-row">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-pill"
                  onClick={() => {
                    setUrlInput(`https://www.youtube.com/watch?v=${preset.id}`);
                    playDirectUrl(preset.id);
                  }}
                  disabled={isLoading}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
