"use client";

import React from "react";
import {
  Sparkles,
  Video,
  Music2,
  AlertCircle,
  Loader2,
  X,
  Check,
  Download,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { CutterFormat, VideoQuality, formatTime } from "../types";

interface CutterExportPanelProps {
  videoId: string;
  format: CutterFormat;
  setFormat: (fmt: CutterFormat) => void;
  quality: string;
  setQuality: (q: string) => void;
  bitrate: string;
  setBitrate: (b: string) => void;
  availableQualities: VideoQuality[];
  startTime: number;
  endTime: number;
  cutDuration: number;
  isCutting: boolean;
  cutProgress: number;
  cutStageMessage: string;
  cutDownloadUrl: string | null;
  cutError: string | null;
  cancelCutProcess: () => void;
  handleStartCut: () => void;
}

export function CutterExportPanel({
  videoId,
  format,
  setFormat,
  quality,
  setQuality,
  bitrate,
  setBitrate,
  availableQualities,
  startTime,
  endTime,
  cutDuration,
  isCutting,
  cutProgress,
  cutStageMessage,
  cutDownloadUrl,
  cutError,
  cancelCutProcess,
  handleStartCut,
}: CutterExportPanelProps) {
  return (
    <div className="cutter-card cutter-settings-card">
      <h3 className="cutter-settings-title">
        <Sparkles size={18} color="#ff0033" />
        <span>Export Settings</span>
      </h3>

      {/* Format Toggle */}
      <div className="cutter-format-toggle">
        <button
          type="button"
          className={`cutter-format-btn ${format === "mp4" ? "active" : ""}`}
          onClick={() => setFormat("mp4")}
        >
          <Video size={16} />
          <span>MP4 Video</span>
        </button>
        <button
          type="button"
          className={`cutter-format-btn ${format === "mp3" ? "active" : ""}`}
          onClick={() => setFormat("mp3")}
        >
          <Music2 size={16} />
          <span>MP3 Audio</span>
        </button>
      </div>

      {/* Quality Selector */}
      {format === "mp4" ? (
        <div className="cutter-setting-row">
          <label className="cutter-setting-label" htmlFor="cutter-quality-select">
            <span>Video Quality</span>
            <span style={{ color: "#00f0ff" }}>Original Ratio</span>
          </label>
          <select
            id="cutter-quality-select"
            className="cutter-select"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
          >
            {availableQualities.map((q) => (
              <option key={q.height} value={String(q.height)}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="cutter-setting-row">
          <label className="cutter-setting-label" htmlFor="cutter-bitrate-select">
            <span>Audio Bitrate</span>
            <span style={{ color: "#00f0ff" }}>High Fidelity</span>
          </label>
          <select
            id="cutter-bitrate-select"
            className="cutter-select"
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
          >
            <option value="320">320 kbps (Ultra High Quality)</option>
            <option value="256">256 kbps (Studio Quality)</option>
            <option value="192">192 kbps (Standard MP3)</option>
            <option value="128">128 kbps (Compact Data Saver)</option>
          </select>
        </div>
      )}

      {/* Summary Specs */}
      <div className="cutter-summary-box">
        <div className="cutter-summary-item">
          <span className="cutter-summary-item-label">Output Format:</span>
          <span className="cutter-summary-item-val">
            {format.toUpperCase()} ({format === "mp4" ? `${quality}p HD` : `${bitrate} kbps`})
          </span>
        </div>
        <div className="cutter-summary-item">
          <span className="cutter-summary-item-label">Start Time:</span>
          <span className="cutter-summary-item-val">{videoId ? formatTime(startTime) : "--:--"}</span>
        </div>
        <div className="cutter-summary-item">
          <span className="cutter-summary-item-label">End Time:</span>
          <span className="cutter-summary-item-val">{videoId ? formatTime(endTime) : "--:--"}</span>
        </div>
        <div className="cutter-summary-item">
          <span className="cutter-summary-item-label">Cut Length:</span>
          <span className="cutter-summary-item-val" style={{ color: "#00f0ff" }}>
            {videoId ? formatTime(cutDuration) : "--:--"}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {cutError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#ff4757",
            fontSize: "0.85rem",
            background: "rgba(255, 71, 87, 0.1)",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 71, 87, 0.25)",
          }}
        >
          <AlertCircle size={16} />
          <span>{cutError}</span>
        </div>
      )}

      {/* Live Processing Progress Box */}
      {isCutting && (
        <div className="cutter-progress-box">
          <div className="cutter-progress-header">
            <div className="cutter-progress-stage">
              <Loader2 size={16} className="cutter-spinner" color="#00f0ff" />
              <span>{cutStageMessage || "Cutting segment..."}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="cutter-progress-pct">{cutProgress}%</span>
              <button
                type="button"
                className="cutter-cancel-cut-btn"
                onClick={cancelCutProcess}
                title="Cancel trimming"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
          <div className="cutter-progress-bar-bg">
            <div
              className="cutter-progress-bar-fill"
              style={{ width: `${cutProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Ready Download Link */}
      {cutDownloadUrl && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "14px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#10b981",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              <Check size={18} />
              <span>Cut Complete & Ready!</span>
            </div>
            <button
              type="button"
              onClick={cancelCutProcess}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                borderRadius: "8px",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
              title="Clear download and prepare a new cut"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
          <a
            href={cutDownloadUrl}
            download
            className="cutter-ready-btn"
            id="cutter-download-file-btn"
          >
            <Download size={18} />
            <span>Download Cut {format.toUpperCase()}</span>
          </a>
        </div>
      )}

      {/* Trigger Cut Button */}
      {!cutDownloadUrl && (
        <button
          type="button"
          className="cutter-download-cta"
          onClick={handleStartCut}
          disabled={!videoId || isCutting || cutDuration <= 0}
          id="cutter-start-cut-btn"
        >
          {isCutting ? (
            <>
              <Loader2 size={20} className="cutter-spinner" />
              <span>Processing Cut…</span>
            </>
          ) : !videoId ? (
            <>
              <Scissors size={20} />
              <span>Select a Video to Cut</span>
            </>
          ) : (
            <>
              <Scissors size={20} />
              <span>Cut & Download {format.toUpperCase()}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
