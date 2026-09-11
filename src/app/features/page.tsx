import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Music,
  Play,
  Download,
  Activity,
  Link as LinkIcon,
  ListMusic,
  Video,
  Keyboard,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Smartphone,
  Cpu,
} from "lucide-react";
import "../about/about.css";

export const metadata: Metadata = {
  title: "YTaudio Features — High-Quality Music Streamer, Downloader & Player",
  description:
    "Explore YTaudio features: Screen-off background playback, real-time audio visualizer, MP3/MP4 conversion download, YouTube link importer, smart queue drawer, and keyboard controls.",
  keywords: [
    "ytaudio features",
    "youtube audio downloader",
    "youtube music mp3 converter",
    "web audio visualizer youtube",
    "youtube background player features",
    "youtube queue manager",
  ],
  openGraph: {
    title: "YTaudio Features — Everything You Need for Sound",
    description:
      "From lock-screen background playback to real-time audio visualization and 320kbps MP3 conversion, explore what makes YTaudio unique.",
    type: "website",
    url: "/features",
  },
};

export default function FeaturesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: "YTaudio Features",
    description:
      "Full breakdown of YTaudio player capabilities: background audio streaming, audio visualizer, queue manager, MP3 downloader, and direct URL player.",
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "YTaudio",
      applicationCategory: "MultimediaApplication",
      featureList: [
        "Screen-off background playback with MediaSession API",
        "Direct YouTube URL importer",
        "Real-time spectrum audio visualizer",
        "High-fidelity MP3 and MP4 converter with live progress",
        "Smart queue manager and playback history",
        "Keyboard shortcut navigation",
      ],
    },
  };

  const featuresList = [
    {
      title: "Lock-Screen & Background Play",
      badge: "Flagship",
      highlight: true,
      icon: Smartphone,
      desc: "Stream with your phone screen turned completely off or while switching between apps. Integrated with the browser MediaSession API for lock-screen album art, track scrub, and play/pause controls.",
      bullets: [
        "Works on Android Chrome, iOS Safari, desktop browsers",
        "Full lock-screen metadata and album artwork",
        "Zero interruption when receiving notifications or switching apps",
      ],
    },
    {
      title: "Real-Time Spectrum Visualizer",
      badge: "Interactive",
      highlight: false,
      icon: Activity,
      desc: "Immerse yourself in music with our built-in real-time audio frequency visualizer powered by the Web Audio API. Watch responsive frequency bars dance in sync with your favorite tracks.",
      bullets: [
        "Hardware-accelerated canvas rendering",
        "Vibrant neon cyberpunk gradient aesthetic",
        "Toggles on/off with one click without playback interruption",
      ],
    },
    {
      title: "MP3 & MP4 Offline Downloader",
      badge: "High Bitrate",
      highlight: true,
      icon: Download,
      desc: "Save your favorite tracks and podcasts for offline listening. Download crystal-clear 320kbps MP3 audio or full high-definition MP4 video with real-time SSE progress streaming.",
      bullets: [
        "Live progress bar from download to conversion",
        "Multiple audio formats and quality presets",
        "Clean server-side temporary file cleanup",
      ],
    },
    {
      title: "Direct YouTube Link Streamer",
      badge: "Universal",
      highlight: false,
      icon: LinkIcon,
      desc: "Paste any YouTube video link, shorts URL, or youtu.be shortlink directly into the player. YTaudio resolves the stream and starts playing within milliseconds.",
      bullets: [
        "Supports standard YouTube, Shorts, and youtu.be URLs",
        "Auto-extracts track title, channel name, and thumbnail",
        "Instant one-click add to active queue",
      ],
    },
    {
      title: "Smart Queue & Rewind Playlist",
      badge: "Productivity",
      highlight: false,
      icon: ListMusic,
      desc: "Manage your listening session with our sleek slide-out queue drawer. Reorder upcoming songs, remove tracks, or revisit your recently played rewind history with persistent local storage.",
      bullets: [
        "Seamless auto-play to the next track",
        "Persistent listening history across browser tabs",
        "Drag-free intuitive queue reordering",
      ],
    },
    {
      title: "Dual Audio & Video Modes",
      badge: "Versatile",
      highlight: false,
      icon: Video,
      desc: "Primarily an audio-first player, but you never miss the visuals. Switch to video mode anytime with our interactive floating modal to watch music videos or presentations.",
      bullets: [
        "Synchronized position when switching between modes",
        "Floating draggable or modal video window",
        "Preserves your bandwidth when minimized",
      ],
    },
    {
      title: "Desktop Keyboard Shortcuts",
      badge: "Power Users",
      highlight: false,
      icon: Keyboard,
      desc: "Control your entire listening experience without touching your mouse. YTaudio includes standard desktop media hotkeys for instant playback adjustment.",
      bullets: [
        "Space: Play / Pause toggle",
        "Left / Right arrows: Seek backward / forward 5s",
        "Up / Down arrows: Volume increase / decrease",
        "M key: Instant mute / unmute",
      ],
    },
    {
      title: "Smart Search & Instant Autocomplete",
      badge: "Discovery",
      highlight: false,
      icon: Music,
      desc: "Find songs, artists, DJ sets, or podcasts instantly with debounced search suggestions, recent search history chips, and curated genre quick-filters.",
      bullets: [
        "Live Google/YouTube autocomplete suggestions",
        "Quick genre category pills (Lofi, Gaming, Chill, Bollywood)",
        "Recent search history with one-tap clear",
      ],
    },
    {
      title: "Ultra-Lightweight & Zero Bloat",
      badge: "Performance",
      highlight: false,
      icon: Cpu,
      desc: "Engineered with modern Next.js 15, SSR streaming, and modular vanilla CSS for lightning-fast first contentful paint (FCP) and near-zero memory footprint.",
      bullets: [
        "No heavy client bundles or tracker scripts",
        "Instant responsive design across mobile and desktop",
        "Progressive Web App (PWA) ready",
      ],
    },
  ];

  return (
    <div className="seo-page-wrapper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <Link href="/features" className="seo-nav-link active">
            Features
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
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Complete Feature Breakdown</span>
          </div>
          <h1 className="hero-heading">
            Engineered For The Ultimate <br />
            Audio Experience
          </h1>
          <p className="hero-subheading" style={{ margin: "0 auto" }}>
            Every tool you need to stream, queue, visualize, and download your favorite sound tracks —
            packaged in an ultra-fast, modern glassmorphism interface.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="features-grid">
          {featuresList.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className={`feature-card ${f.highlight ? "highlight" : ""}`}
              >
                <span className="feature-badge-tag">{f.badge}</span>
                <div className="feature-icon-wrapper">
                  <Icon size={26} />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-bullets">
                  {f.bullets.map((b, bIdx) => (
                    <div key={bIdx} className="feature-bullet-item">
                      <ShieldCheck size={14} color="#00f0ff" style={{ flexShrink: 0 }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div style={{ marginTop: "64px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2 style={{ fontSize: "1.9rem", fontWeight: "800", marginBottom: "8px" }}>
              How YTaudio Compares
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              Compare YTaudio with standard video streaming and mainstream music subscriptions.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="brand-col">YTaudio</th>
                  <th>YouTube Free</th>
                  <th>Spotify Free</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Screen-Off Lock Background Play</td>
                  <td className="check-col"><Check size={18} /> Included (Free)</td>
                  <td className="cross-col"><X size={18} /> Requires Premium ($13.99/mo)</td>
                  <td className="check-col"><Check size={18} /> Included</td>
                </tr>
                <tr>
                  <td>Data Consumption</td>
                  <td className="check-col"><Check size={18} /> Low (~3-5MB/song)</td>
                  <td className="cross-col"><X size={18} /> High (~120MB/song)</td>
                  <td className="check-col"><Check size={18} /> Low (~3-5MB/song)</td>
                </tr>
                <tr>
                  <td>On-Demand Any Song Selection</td>
                  <td className="check-col"><Check size={18} /> Unlimited Pick & Play</td>
                  <td className="check-col"><Check size={18} /> Unlimited</td>
                  <td className="cross-col"><X size={18} /> Forced Shuffle Only</td>
                </tr>
                <tr>
                  <td>Access to Indie Remixes & Bootlegs</td>
                  <td className="check-col"><Check size={18} /> Full YouTube Catalog</td>
                  <td className="check-col"><Check size={18} /> Full YouTube Catalog</td>
                  <td className="cross-col"><X size={18} /> Limited to Label Releases</td>
                </tr>
                <tr>
                  <td>Direct Link Import & Stream</td>
                  <td className="check-col"><Check size={18} /> Yes (Any Link)</td>
                  <td className="cross-col"><X size={18} /> Video Only</td>
                  <td className="cross-col"><X size={18} /> No</td>
                </tr>
                <tr>
                  <td>Built-in Spectrum Visualizer</td>
                  <td className="check-col"><Check size={18} /> Real-time Web Audio</td>
                  <td className="cross-col"><X size={18} /> No</td>
                  <td className="cross-col"><X size={18} /> No</td>
                </tr>
                <tr>
                  <td>Offline MP3 / MP4 Download</td>
                  <td className="check-col"><Check size={18} /> 320kbps MP3 / 1080p MP4</td>
                  <td className="cross-col"><X size={18} /> Premium Encrypted Only</td>
                  <td className="cross-col"><X size={18} /> Premium Encrypted Only</td>
                </tr>
                <tr>
                  <td>Forced Account Login</td>
                  <td className="check-col"><Check size={18} /> None Required</td>
                  <td className="cross-col"><X size={18} /> Often Required</td>
                  <td className="cross-col"><X size={18} /> Mandatory</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="cta-banner">
          <h2 className="cta-title">Experience Sound Without Restrictions</h2>
          <p className="cta-desc">
            No installation, no subscription fees, no battery-burning videos. Just pure music at your fingertips.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="seo-play-now-btn" style={{ padding: "12px 28px", fontSize: "1rem" }}>
              <Play size={18} fill="#ffffff" />
              <span>Launch YTaudio Now</span>
            </Link>
            <Link
              href="/about"
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
              <span>Why We Built This</span>
              <ArrowRight size={16} />
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
        </div>
      </footer>
    </div>
  );
}
