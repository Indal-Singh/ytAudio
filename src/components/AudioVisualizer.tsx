"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Music, Disc3, Radio } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export function AudioVisualizer() {
  const {
    currentTrack,
    isPlaying,
    analyser,
    showVisualizer,
    setShowVisualizer,
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visualMode, setVisualMode] = useState<"bars" | "wave" | "circle">("bars");

  useEffect(() => {
    if (!showVisualizer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      animationId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Fetch real frequency data or generate simulation
      let hasRealAudio = false;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > 0) {
            hasRealAudio = true;
            break;
          }
        }
      }

      if (!hasRealAudio && isPlaying) {
        phase += 0.05;
        for (let i = 0; i < dataArray.length; i++) {
          const v =
            Math.sin(phase + i * 0.15) * 45 +
            Math.cos(phase * 1.5 + i * 0.3) * 35 +
            130;
          dataArray[i] = Math.min(255, Math.max(30, Math.floor(v)));
        }
      } else if (!isPlaying) {
        // Idle gentle wave
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(8, dataArray[i] * 0.9);
        }
      }

      if (visualMode === "bars") {
        // Neon frequency bars with gradient
        const barCount = 48;
        const barWidth = Math.max(4, (width / barCount) * 0.65);
        const gap = (width - barCount * barWidth) / (barCount + 1);

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (dataArray.length / 2));
          const val = (dataArray[index] || 0) / 255;
          const barHeight = Math.max(6, val * (height * 0.75));

          const x = gap + i * (barWidth + gap);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, "#00f0ff");
          grad.addColorStop(0.4, "#9d4edd");
          grad.addColorStop(1, "#ff0033");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Glow cap
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, Math.max(0, y - 4), barWidth, 2);
        }
      } else if (visualMode === "wave") {
        // Smooth undulating neon wave
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ff0033";
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#ff0033";

        const sliceWidth = width / (dataArray.length - 1);
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Circular aura
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.28;
        const total = 64;

        for (let i = 0; i < total; i++) {
          const angle = (i / total) * Math.PI * 2;
          const val = (dataArray[i % dataArray.length] || 0) / 255;
          const barLen = val * 70;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLen);
          const y2 = centerY + Math.sin(angle) * (radius + barLen);

          ctx.strokeStyle = `hsl(${i * 5 + 320}, 100%, 65%)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [showVisualizer, visualMode, isPlaying, analyser]);

  if (!showVisualizer) return null;

  return (
    <div className="visualizer-modal-overlay">
      <div className="visualizer-container glass-panel">
        {/* Top Header */}
        <div className="visualizer-header">
          <div className="track-hero-info">
            <Sparkles size={20} color="#00f0ff" />
            <div>
              <h2 className="hero-title">{currentTrack?.title || "Audio Stream"}</h2>
              <p className="hero-artist">{currentTrack?.uploader || "YTaudio"}</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="mode-toggle-group">
              <button
                className={`mode-btn ${visualMode === "bars" ? "mode-active" : ""}`}
                onClick={() => setVisualMode("bars")}
              >
                Equalizer
              </button>
              <button
                className={`mode-btn ${visualMode === "wave" ? "mode-active" : ""}`}
                onClick={() => setVisualMode("wave")}
              >
                Wave
              </button>
              <button
                className={`mode-btn ${visualMode === "circle" ? "mode-active" : ""}`}
                onClick={() => setVisualMode("circle")}
              >
                Radial
              </button>
            </div>

            <button
              className="close-btn"
              onClick={() => setShowVisualizer(false)}
              aria-label="Close visualizer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Visualizer Canvas Area */}
        <div className="canvas-wrapper">
          {currentTrack && (
            <div className={`center-artwork-wrapper ${isPlaying ? "artwork-pulsing" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="center-artwork-img"
              />
            </div>
          )}
          <canvas ref={canvasRef} className="visualizer-canvas" />
        </div>

        <div className="visualizer-footer">
          <div className="stream-badge">
            <Radio size={14} color="#00f0ff" />
            <span>High-quality audio stream</span>
          </div>
          <span className="footer-tip">Powered by Indal Singh</span>
        </div>
      </div>

      <style jsx>{`
        .visualizer-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(8, 10, 14, 0.88);
          backdrop-filter: blur(24px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .visualizer-container {
          width: 100%;
          max-width: 900px;
          height: 600px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 0, 51, 0.15);
          overflow: hidden;
          position: relative;
        }

        .visualizer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(18, 20, 26, 0.6);
        }

        .track-hero-info {
          display: flex;
          align-items: center;
          gap: 14px;
          max-width: 55%;
        }

        .hero-title {
          font-size: 1.05rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hero-artist {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mode-toggle-group {
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 3px;
        }

        .mode-btn {
          padding: 5px 12px;
          font-size: 0.78rem;
          font-weight: 500;
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          color: var(--text-primary);
        }

        .mode-active {
          background: var(--gradient-brand);
          color: #ffffff;
          font-weight: 600;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background: var(--bg-hover);
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: var(--yt-red);
          color: #ffffff;
        }

        .canvas-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(circle at center, rgba(157, 78, 221, 0.1) 0%, transparent 75%);
        }

        .center-artwork-wrapper {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.9);
          z-index: 10;
          transition: transform 0.3s ease;
        }

        .artwork-pulsing {
          animation: pulse-artwork 2.5s infinite ease-in-out;
        }

        @keyframes pulse-artwork {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 0, 51, 0.3); }
          50% { transform: scale(1.06); box-shadow: 0 0 40px rgba(0, 240, 255, 0.4); }
        }

        .center-artwork-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .visualizer-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .visualizer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.78rem;
          color: var(--text-muted);
          background: rgba(18, 20, 26, 0.6);
        }

        .stream-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
        }

        .footer-tip {
          font-family: var(--font-mono);
          font-size: 0.72rem;
        }

        @media (max-width: 768px) {
          .visualizer-modal-overlay {
            padding: 0;
          }
          .visualizer-container {
            max-width: 100%;
            height: 100%;
            height: 100dvh;
            border-radius: 0;
            border: none;
          }
          .visualizer-header {
            padding: 12px 14px;
            flex-wrap: wrap;
            gap: 10px;
          }
          .track-hero-info {
            max-width: 100%;
            flex: 1 1 auto;
            min-width: 0;
          }
          .hero-title {
            font-size: 0.95rem;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
            gap: 8px;
          }
          .mode-toggle-group {
            flex: 1;
          }
          .mode-btn {
            flex: 1;
            padding: 8px 6px;
            font-size: 0.72rem;
          }
          .center-artwork-wrapper {
            width: 120px;
            height: 120px;
          }
          .visualizer-footer {
            padding: 10px 16px;
            padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          }
          .footer-tip {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
