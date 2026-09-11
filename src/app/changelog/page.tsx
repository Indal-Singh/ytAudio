import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Music,
  Play,
  Sparkles,
  GitCommit,
  CheckCircle2,
  Wrench,
  Zap,
} from "lucide-react";
import "../about/about.css";
import "./changelog.css";

export const metadata: Metadata = {
  title: "Changelog & Release Notes — YTaudio Version History",
  description:
    "Explore the complete version history of YTaudio: new features, performance optimizations, bug fixes, and audio engine enhancements.",
  keywords: [
    "ytaudio changelog",
    "ytaudio version history",
    "ytaudio updates",
    "youtube audio streamer release notes",
  ],
  openGraph: {
    title: "YTaudio Changelog — Product Updates & Version History",
    description:
      "Track every update to YTaudio: background playback, modular UI architecture, live MP3 conversion, and SEO optimizations.",
    type: "website",
    url: "/changelog",
  },
};

export default function ChangelogPage() {
  const releases = [
    {
      version: "v2.1.0",
      date: "September 11, 2026",
      isLatest: true,
      added: [
        {
          title: "Dedicated SEO Landing Pages",
          detail: "Launched /about (Why YTaudio exists) and /features (detailed feature matrix & comparison table against YouTube Free and Spotify).",
        },
        {
          title: "Comprehensive Google SEO Suite",
          detail: "Added dynamic sitemap.xml, robots.txt, JSON-LD structured schemas (WebApplication, AboutPage, ItemPage), and Web App Manifest (manifest.webmanifest).",
        },
        {
          title: "High-Resolution Favicons & Apple Touch Icons",
          detail: "Added scalable SVG favicon and 180x180 Apple Touch icons with signature brand gradients.",
        },
        {
          title: "Live SSE Download Progress & Auto-Cleanup",
          detail: "Real-time Server-Sent Events progress reporting during MP3 and MP4 conversion, with automated temporary file cleanup.",
        },
        {
          title: "Optional YouTube Cookie Injection",
          detail: "Configurable YTDLP_COOKIES_PATH and YTDLP_COOKIES_BROWSER in .env to prevent bot check interruptions.",
        },
      ],
      improved: [
        {
          title: "Dynamic Canonical URL Handling",
          detail: "Configured NEXT_PUBLIC_SITE_URL environment variable to ensure production metadata matches yta.indalsingh.dev.",
        },
      ],
      fixed: [
        {
          title: "PostCSS Syntax Compliance",
          detail: "Resolved :global pseudo-class syntax issue in DownloadModal.css for standard CSS builds.",
        },
      ],
    },
    {
      version: "v2.0.0",
      date: "September 10, 2026",
      isLatest: false,
      added: [
        {
          title: "SSR Preloader Skeleton",
          detail: "Implemented critical inline preloader in root layout to completely eradicate initial hydration flash.",
        },
        {
          title: "Modular Component Architecture",
          detail: "Refactored monolithic components into dedicated CSS and isolated React modules (Navbar, PlayerBar, QueueDrawer, AudioCard, etc.).",
        },
      ],
      improved: [
        {
          title: "Context Hook Decomposition",
          detail: "Extracted usePlayerStorage, usePlayerMediaSession, and usePlayerKeyboard out of PlayerContext to boost re-render efficiency.",
        },
      ],
      fixed: [
        {
          title: "Playlist Overfetch Prevention",
          detail: "Optimized ytsearch batch size to eliminate unnecessary overhead during quick category browsing.",
        },
      ],
    },
    {
      version: "v1.5.0",
      date: "September 08, 2026",
      isLatest: false,
      added: [
        {
          title: "Lock-Screen & Background Playback",
          detail: "Full HTML5 MediaSession API integration providing lock-screen track title, artist, artwork, and scrub controls.",
        },
        {
          title: "Real-Time Spectrum Visualizer",
          detail: "Hardware-accelerated frequency visualizer rendered via HTML5 Canvas and Web Audio API.",
        },
        {
          title: "Direct YouTube Link Importer",
          detail: "Paste any YouTube, youtu.be, or Shorts link to play or download immediately without searching.",
        },
      ],
      improved: [
        {
          title: "Up Next & Rewind Playlist Drawer",
          detail: "Sliding queue drawer with track reordering and persistent localStorage playback memory.",
        },
      ],
      fixed: [],
    },
    {
      version: "v1.0.0",
      date: "September 01, 2026",
      isLatest: false,
      added: [
        {
          title: "Initial Launch of YTaudio",
          detail: "Pure audio-first streaming extracted from YouTube using high-performance yt-dlp and FFmpeg pipelines.",
        },
        {
          title: "Smart Autocomplete Search",
          detail: "Live suggestions as you type with instant debouncing and recent search chips.",
        },
        {
          title: "Dark Cyberpunk Glassmorphism UI",
          detail: "Aesthetic neon gradients, responsive drawer layouts, and custom audio controls.",
        },
      ],
      improved: [],
      fixed: [],
    },
  ];

  return (
    <div className="seo-page-wrapper">
      {/* Header Bar */}
      <header className="seo-nav">
        <Link href="/" className="seo-nav-brand">
          <div className="seo-nav-logo">
            <Music size={20} color="#ffffff" />
          </div>
          <span className="seo-nav-title">YTaudio</span>
        </Link>

        <nav className="seo-nav-links">
          <Link href="/about" className="seo-nav-link">
            Why YTaudio?
          </Link>
          <Link href="/features" className="seo-nav-link">
            Features
          </Link>
          <Link href="/changelog" className="seo-nav-link active">
            Changelog
          </Link>
          <Link href="/" className="seo-play-now-btn">
            <Play size={14} fill="#ffffff" />
            <span>Launch Player</span>
          </Link>
        </nav>
      </header>

      {/* Main Container */}
      <main className="seo-container">
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Version History & Updates</span>
          </div>
          <h1 className="hero-heading">Changelog & Releases</h1>
          <p className="hero-subheading" style={{ margin: "0 auto" }}>
            Stay up to date with new features, audio streaming improvements, bug fixes, and performance updates across all versions of YTaudio.
          </p>
        </div>

        {/* Timeline */}
        <div className="changelog-timeline">
          {releases.map((rel) => (
            <article
              key={rel.version}
              className={`release-card ${rel.isLatest ? "latest" : ""}`}
            >
              <div className="release-node-dot" />

              <div className="release-header">
                <div className="release-title-group">
                  <span className="version-pill">{rel.version}</span>
                  {rel.isLatest && <span className="current-badge">Current Release</span>}
                </div>
                <time className="release-date">{rel.date}</time>
              </div>

              {/* Added Features */}
              {rel.added.length > 0 && (
                <div className="change-group">
                  <div className="change-group-title tag-added">
                    <CheckCircle2 size={13} />
                    <span>New Features</span>
                  </div>
                  <ul className="change-list">
                    {rel.added.map((item, i) => (
                      <li key={i} className="change-item">
                        <span className="change-bullet">•</span>
                        <div>
                          <strong>{item.title}:</strong> {item.detail}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {rel.improved.length > 0 && (
                <div className="change-group">
                  <div className="change-group-title tag-improved">
                    <Zap size={13} />
                    <span>Improvements</span>
                  </div>
                  <ul className="change-list">
                    {rel.improved.map((item, i) => (
                      <li key={i} className="change-item">
                        <span className="change-bullet">•</span>
                        <div>
                          <strong>{item.title}:</strong> {item.detail}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fixes */}
              {rel.fixed.length > 0 && (
                <div className="change-group">
                  <div className="change-group-title tag-fixed">
                    <Wrench size={13} />
                    <span>Fixes</span>
                  </div>
                  <ul className="change-list">
                    {rel.fixed.map((item, i) => (
                      <li key={i} className="change-item">
                        <span className="change-bullet">•</span>
                        <div>
                          <strong>{item.title}:</strong> {item.detail}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="cta-banner">
          <h2 className="cta-title">Try the Latest Version</h2>
          <p className="cta-desc">
            Experience the latest v2.1.0 release with screen-off background play, direct link importing, and zero data waste.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="seo-play-now-btn" style={{ padding: "12px 28px", fontSize: "1rem" }}>
              <Play size={18} fill="#ffffff" />
              <span>Launch YTaudio</span>
            </Link>
            <Link
              href="/features"
              className="seo-nav-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                background: "rgba(255,255,255,0.05)",
                color: "#ffffff",
              }}
            >
              <GitCommit size={16} />
              <span>Explore Features</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="seo-footer">
        <p>© {new Date().getFullYear()} YTaudio — Built for the love of music & audio clarity.</p>
        <div style={{ marginTop: "12px", display: "flex", gap: "20px", justifyContent: "center" }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Player</Link>
          <Link href="/about" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Why YTaudio?</Link>
          <Link href="/features" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Features</Link>
          <Link href="/changelog" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Changelog</Link>
        </div>
      </footer>
    </div>
  );
}
