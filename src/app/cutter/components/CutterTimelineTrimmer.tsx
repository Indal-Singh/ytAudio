"use client";

import React from "react";
import { Sliders, RotateCcw } from "lucide-react";
import { formatTime, parseTimeToSeconds } from "../types";

interface CutterTimelineTrimmerProps {
  videoId: string;
  videoDuration: number;
  currentTime: number;
  startTime: number;
  endTime: number;
  setStartTime: React.Dispatch<React.SetStateAction<number>>;
  setEndTime: React.Dispatch<React.SetStateAction<number>>;
  isPreviewingTrim: boolean;
  handleTogglePreviewTrim: () => void;
  handleSetStartToNow: () => void;
  handleSetEndToNow: () => void;
  handleResetTrim: () => void;
  seekPlayer: (seconds: number) => void;
}

export function CutterTimelineTrimmer({
  videoId,
  videoDuration,
  currentTime,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  isPreviewingTrim,
  handleTogglePreviewTrim,
  handleSetStartToNow,
  handleSetEndToNow,
  handleResetTrim,
  seekPlayer,
}: CutterTimelineTrimmerProps) {
  const cutDuration = Math.max(0, endTime - startTime);
  const startPercent =
    videoDuration > 0 ? Math.max(0, Math.min(100, (startTime / videoDuration) * 100)) : 0;
  const endPercent =
    videoDuration > 0 ? Math.max(0, Math.min(100, (endTime / videoDuration) * 100)) : 100;
  const playheadPercent =
    videoDuration > 0 ? Math.max(0, Math.min(100, (currentTime / videoDuration) * 100)) : 0;

  return (
    <div className="cutter-card">
      <div className="cutter-timeline-header">
        <div className="cutter-timeline-title">
          <Sliders size={18} color="#00f0ff" />
          <span>Timeline Trimmer</span>
        </div>
        {videoId && (
          <div className="cutter-duration-pill">
            Clip: {formatTime(cutDuration)} ({formatTime(startTime)} → {formatTime(endTime)})
          </div>
        )}
      </div>

      {!videoId ? (
        <div className="cutter-timeline-placeholder">
          ⚡ Search or select a video above to activate the dual-range timeline trimmer and frame nudging.
        </div>
      ) : (
        <>
          {/* Visual Dual-Range Scrubber Track */}
          <div className="cutter-timeline-box">
            <div
              className="cutter-scrubber-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                seekPlayer(pct * (videoDuration || 100));
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const track = e.currentTarget;
                const updateSeek = (clientX: number) => {
                  const rect = track.getBoundingClientRect();
                  if (rect.width <= 0) return;
                  const clickX = clientX - rect.left;
                  const pct = Math.max(0, Math.min(1, clickX / rect.width));
                  seekPlayer(pct * (videoDuration || 100));
                };

                updateSeek(e.clientX);

                const onPointerMove = (moveEvent: PointerEvent) => {
                  updateSeek(moveEvent.clientX);
                };

                const onPointerUp = () => {
                  window.removeEventListener("pointermove", onPointerMove);
                  window.removeEventListener("pointerup", onPointerUp);
                };

                window.addEventListener("pointermove", onPointerMove);
                window.addEventListener("pointerup", onPointerUp);
              }}
            >
              {/* Highlighted Selected Cut Zone */}
              <div
                className="cutter-scrubber-cut-region"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(1, endPercent - startPercent)}%`,
                }}
              />

              {/* Active Playhead Indicator */}
              <div
                className="cutter-scrubber-playhead"
                style={{ left: `${playheadPercent}%` }}
              >
                <div className="cutter-playhead-cap" />
              </div>

              {/* Start Marker Handle */}
              <div
                className="cutter-handle-marker cutter-handle-marker-start"
                style={{ left: `${startPercent}%` }}
              >
                <div className="cutter-handle-grip" />
              </div>

              {/* End Marker Handle */}
              <div
                className="cutter-handle-marker cutter-handle-marker-end"
                style={{ left: `${endPercent}%` }}
              >
                <div className="cutter-handle-grip" />
              </div>

              {/* Dual Range Sliders for Touch & Dragging */}
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                step="0.1"
                value={startTime}
                className="cutter-range-input"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setStartTime(Math.min(val, endTime - 0.5));
                }}
              />
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                step="0.1"
                value={endTime}
                className="cutter-range-input"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setEndTime(Math.max(val, startTime + 0.5));
                }}
              />
            </div>

            {/* Quick 1-Click Action Buttons */}
            <div className="cutter-timeline-actions">
              <div className="cutter-actions-group cutter-actions-group-markers">
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={handleSetStartToNow}
                  title="Set start cut marker to playhead"
                >
                  📍 Set Start [Now]
                </button>
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={handleSetEndToNow}
                  title="Set end cut marker to playhead"
                >
                  📍 Set End [Now]
                </button>
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={() => seekPlayer(startTime)}
                  title="Seek to start point"
                >
                  ⏪ Go to Start
                </button>
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={() => seekPlayer(endTime)}
                  title="Seek to end point"
                >
                  ⏩ Go to End
                </button>
              </div>

              <div className="cutter-actions-group cutter-actions-group-playback">
                <button
                  type="button"
                  className={`cutter-btn-pill ${isPreviewingTrim ? "active" : ""}`}
                  onClick={handleTogglePreviewTrim}
                  title="Play only the selected trimmed segment"
                >
                  <RotateCcw size={14} />
                  <span>{isPreviewingTrim ? "Stop Loop" : "Preview Cut"}</span>
                </button>
                <button
                  type="button"
                  className="cutter-btn-pill"
                  onClick={handleResetTrim}
                  title="Reset selection to full video"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Precision Time Inputs with Frame Nudge */}
          <div className="cutter-inputs-grid">
            {/* Start Time Box */}
            <div className="cutter-time-box">
              <div className="cutter-time-box-label start">
                <span>START TIME</span>
                <span>Marker [A]</span>
              </div>
              <div className="cutter-time-field-wrap">
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setStartTime((s) => Math.max(0, s - 1))}
                  title="Minus 1 second"
                >
                  -1s
                </button>
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setStartTime((s) => Math.max(0, s - 0.1))}
                  title="Minus 0.1 frame"
                >
                  -.1
                </button>
                <input
                  type="text"
                  className="cutter-time-input"
                  value={formatTime(startTime)}
                  onChange={(e) => {
                    const s = parseTimeToSeconds(e.target.value);
                    setStartTime(Math.min(s, endTime - 0.5));
                  }}
                />
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setStartTime((s) => Math.min(endTime - 0.5, s + 0.1))}
                  title="Plus 0.1 frame"
                >
                  +.1
                </button>
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setStartTime((s) => Math.min(endTime - 0.5, s + 1))}
                  title="Plus 1 second"
                >
                  +1s
                </button>
              </div>
            </div>

            {/* End Time Box */}
            <div className="cutter-time-box">
              <div className="cutter-time-box-label end">
                <span>END TIME</span>
                <span>Marker [B]</span>
              </div>
              <div className="cutter-time-field-wrap">
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setEndTime((e) => Math.max(startTime + 0.5, e - 1))}
                  title="Minus 1 second"
                >
                  -1s
                </button>
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setEndTime((e) => Math.max(startTime + 0.5, e - 0.1))}
                  title="Minus 0.1 frame"
                >
                  -.1
                </button>
                <input
                  type="text"
                  className="cutter-time-input"
                  value={formatTime(endTime)}
                  onChange={(e) => {
                    const en = parseTimeToSeconds(e.target.value);
                    setEndTime(Math.max(startTime + 0.5, Math.min(en, videoDuration)));
                  }}
                />
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setEndTime((e) => Math.min(videoDuration, e + 0.1))}
                  title="Plus 0.1 frame"
                >
                  +.1
                </button>
                <button
                  type="button"
                  className="cutter-nudge-btn"
                  onClick={() => setEndTime((e) => Math.min(videoDuration, e + 1))}
                  title="Plus 1 second"
                >
                  +1s
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
