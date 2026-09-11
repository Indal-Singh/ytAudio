"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Music, Disc3, Radio } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import "./AudioVisualizer.css";

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

    </div>
  );
}
