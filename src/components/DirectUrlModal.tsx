"use client";

import React, { useState } from "react";
import { X, Play, Link2, Sparkles, AlertCircle } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

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

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2500;
          background: rgba(8, 10, 14, 0.85);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          width: 100%;
          max-width: 540px;
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px var(--yt-red-glow);
          overflow: hidden;
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-title {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .close-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-hover);
          transition: all 0.2s ease;
        }

        .close-icon-btn:hover {
          background: var(--yt-red);
          color: #ffffff;
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .modal-description {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .input-field-group {
          display: flex;
          gap: 10px;
        }

        .url-input {
          flex: 1;
          padding: 12px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.92rem;
          transition: border-color 0.2s ease;
        }

        .url-input:focus {
          border-color: #3ea6ff;
        }

        .submit-play-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--gradient-brand);
          color: #ffffff;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 4px 14px var(--yt-red-glow);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .submit-play-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .submit-play-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255, 0, 51, 0.15);
          border: 1px solid rgba(255, 0, 51, 0.35);
          border-radius: var(--radius-sm);
          color: #ff4d6d;
          font-size: 0.85rem;
        }

        .presets-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }

        .presets-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .preset-buttons-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preset-pill {
          padding: 6px 12px;
          background: var(--bg-hover);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .preset-pill:hover:not(:disabled) {
          background: var(--bg-active);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 600px) {
          .modal-overlay {
            padding: 12px;
          }
          .modal-header {
            padding: 14px 18px;
          }
          .modal-body {
            padding: 18px 16px;
            gap: 16px;
          }
          .input-field-group {
            flex-direction: column;
          }
          .submit-play-btn {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
