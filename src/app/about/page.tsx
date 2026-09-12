import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryCharging,
  WifiOff,
  Music,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Layers,
  Sparkles,
  Heart,
  ExternalLink,
} from "lucide-react";
import { SeoNavbar } from "@/components/SeoNavbar";
import "./about.css";

export const metadata: Metadata = {
  title: "Why YTaudio? — YouTube Background Player & Audio-First Streaming",
  description:
    "Learn why YTaudio exists: Stream YouTube music with your phone screen locked, save up to 90% mobile data and battery, and enjoy a seamless distraction-free listening experience.",
  keywords: [
    "why use ytaudio",
    "youtube audio player",
    "listen youtube screen locked",
    "save data youtube music",
    "youtube background player web",
    "battery saver youtube audio",
  ],
  openGraph: {
    title: "Why YTaudio? The Smarter Way to Listen to YouTube",
    description:
      "Stop wasting battery and gigabytes rendering video pixels you only listen to. Discover why thousands use YTaudio for pure audio streaming.",
    type: "website",
    url: "/about",
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Why YTaudio Exists",
    description:
      "YTaudio is built to solve YouTube video overhead, offering an audio-first player with background lock-screen support and data-saving streaming.",
    mainEntity: {
      "@type": "WebApplication",
      name: "YTaudio",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  };

  return (
    <div className="seo-page-wrapper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Responsive Top Navigation */}
      <SeoNavbar activePage="about" />

      {/* Main Content */}
      <main className="seo-container">
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>The Pure Audio Revolution</span>
          </div>
          <h1 className="hero-heading">
            Why Stream 1080p Pixels <br />
            When You Just Want The Music?
          </h1>
          <p className="hero-subheading" style={{ margin: "0 auto" }}>
            YouTube holds the world&apos;s largest collection of songs, indie remixes,
            podcasts, and live concerts. But streaming full HD video just to hear sound drains
            your battery, eats your mobile data, and stops playing the second you lock your phone screen.
          </p>
        </div>

        {/* Problem vs Solution Side-by-Side */}
        <div className="problem-solution-grid">
          <div className="card-problem">
            <div className="card-header-icon icon-red">
              <XCircle size={28} />
            </div>
            <h2 className="section-card-title">The Video App Problem</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Traditional video streaming platforms force heavy compute and bandwidth on simple audio tasks:
            </p>
            <div className="card-point-list">
              <div className="card-point">
                <span style={{ color: "var(--yt-red)" }}>•</span>
                <div>
                  <strong>Screen Lock Stoppage:</strong> Lock your screen or switch to WhatsApp, and playback halts instantly unless you pay expensive recurring monthly subscriptions.
                </div>
              </div>
              <div className="card-point">
                <span style={{ color: "var(--yt-red)" }}>•</span>
                <div>
                  <strong>Massive Data Waste:</strong> Streaming a 4-minute 1080p video consumes ~120MB. An entire playlist can chew through an entire monthly mobile data plan in days.
                </div>
              </div>
              <div className="card-point">
                <span style={{ color: "var(--yt-red)" }}>•</span>
                <div>
                  <strong>Battery Overheating:</strong> The GPU and display panel stay pegged at 100% brightness decoding frames your eyes aren&apos;t even looking at.
                </div>
              </div>
            </div>
          </div>

          <div className="card-solution">
            <div className="card-header-icon icon-cyan">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="section-card-title">The YTaudio Solution</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              YTaudio isolates the pure, uncompressed high-fidelity audio stream from any YouTube URL:
            </p>
            <div className="card-point-list">
              <div className="card-point">
                <span style={{ color: "var(--accent-cyan)" }}>•</span>
                <div>
                  <strong>Native Lock-Screen Audio:</strong> Integrated with HTML5 MediaSession API. Lock your phone, put it in your pocket, control tracks from your smartwatch or lock-screen controls.
                </div>
              </div>
              <div className="card-point">
                <span style={{ color: "var(--accent-cyan)" }}>•</span>
                <div>
                  <strong>Up to 90% Less Data:</strong> Audio-only Opus/AAC streams use only ~3MB to 5MB per track. Listen all day on limited mobile cellular packs without worrying.
                </div>
              </div>
              <div className="card-point">
                <span style={{ color: "var(--accent-cyan)" }}>•</span>
                <div>
                  <strong>Zero Distractions:</strong> No algorithmic comment doomscrolling or thumbnail traps. Just pure music, live spectrum visualization, and endless queue management.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Numbers Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <h3>90%</h3>
            <p>Data Saved vs Video</p>
          </div>
          <div className="stat-item">
            <h3>4x</h3>
            <p>Longer Battery Life</p>
          </div>
          <div className="stat-item">
            <h3>100%</h3>
            <p>Free & Web-Based</p>
          </div>
          <div className="stat-item">
            <h3>0 sec</h3>
            <p>App Installation Required</p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ marginTop: "64px" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.9rem", fontWeight: "800", marginBottom: "8px" }}>
              Built From The Ground Up For Sound
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              Every millisecond of YTaudio is tuned for music enthusiasts and podcast listeners.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Lock size={24} />
              </div>
              <h3 className="feature-title">Lock-Screen & Background Play</h3>
              <p className="feature-desc">
                Keep the rhythm going while cooking, driving, studying, or exercising.
                YTaudio stays active in background tabs and when your mobile screen is completely turned off.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <BatteryCharging size={24} />
              </div>
              <h3 className="feature-title">Battery Preservation</h3>
              <p className="feature-desc">
                By bypassing video frame decoding and GPU rendering pipelines, your device stays cool
                and uses only a tiny fraction of its battery capacity over hours of playback.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <WifiOff size={24} />
              </div>
              <h3 className="feature-title">Ultra Data Efficiency</h3>
              <p className="feature-desc">
                YTaudio streams audio directly from the optimal high-bitrate audio codec container, saving up
                to 90% bandwidth compared to streaming 720p or 1080p video streams.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Layers size={24} />
              </div>
              <h3 className="feature-title">Infinite Dynamic Queue</h3>
              <p className="feature-desc">
                Add tracks on the fly, reorder songs with drag-like intuition, remove items, or use our
                built-in Rewind cache to revisit songs you played previously with zero setup.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Direct YouTube Link Import</h3>
              <p className="feature-desc">
                Found an obscure remix, video essay, or podcast on YouTube? Paste its link directly into
                YTaudio to play or download high-quality MP3 audio immediately.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={24} />
              </div>
              <h3 className="feature-title">Privacy Focused & Zero Bloat</h3>
              <p className="feature-desc">
                No forced sign-in required, no tracking cookies on your browsing, and no bloated background telemetry.
                Everything runs directly in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <section className="faq-section">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Is YTaudio free to use?</h4>
              <p>
                Yes! YTaudio is 100% free to use. There are no subscriptions, paywalls, or hidden charges.
                Open the web app in any browser on Android, iOS, Windows, Mac, or Linux and start listening.
              </p>
            </div>
            <div className="faq-item">
              <h4>Can I lock my phone screen while listening?</h4>
              <p>
                Yes! YTaudio supports HTML5 background audio and the MediaSession API. When you turn off
                your phone screen or switch to another app, your audio continues playing uninterrupted.
              </p>
            </div>
            <div className="faq-item">
              <h4>How much mobile data does YTaudio save?</h4>
              <p>
                A typical 1080p YouTube video consumes between 100MB and 150MB for a single 4-minute song.
                With YTaudio&apos;s audio-first streaming, the same song only uses about 3MB to 5MB, saving up to
                90% of your data quota.
              </p>
            </div>
            <div className="faq-item">
              <h4>Do I need to install an APK or App Store application?</h4>
              <p>
                No installation is required. YTaudio is a Progressive Web App (PWA) that runs instantly in Chrome,
                Safari, Brave, Firefox, and Edge. You can also tap &quot;Add to Home Screen&quot; for a full native app feel.
              </p>
            </div>
          </div>
        </section>

        {/* Open Source Credits & Acknowledgements */}
        <section className="faq-section" style={{ marginTop: "48px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div className="section-badge">
              <Heart size={14} color="#ff4d6d" fill="#ff4d6d" />
              <span>Open Source Credits</span>
            </div>
            <h2 className="faq-title" style={{ marginTop: "12px" }}>
              Built With Gratitude
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              YTaudio stands upon these remarkable open-source projects and community-driven initiatives.
            </p>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#10b981" }}>SponsorBlock</h4>
                <a href="https://sponsor.ajay.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}>
                  <span>Visit</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p>
                Created by Ajay Ramachandran. A crowdsourced public database and API that allows YTaudio to automatically skip non-music story dialogues, intro bumpers, sponsor reads, and outros.
              </p>
            </div>

            <div className="faq-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#00f0ff" }}>yt-dlp</h4>
                <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}>
                  <span>GitHub</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p>
                The industry-standard, high-performance command-line multimedia extraction utility used for reliable audio stream resolution.
              </p>
            </div>

            <div className="faq-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#a855f7" }}>FFmpeg</h4>
                <a href="https://ffmpeg.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}>
                  <span>Website</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p>
                The complete cross-platform multimedia solution powering YTaudio&apos;s server-side audio transcoding and 320kbps MP3 conversion pipeline.
              </p>
            </div>

            <div className="faq-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#f59e0b" }}>Next.js & React</h4>
                <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem" }}>
                  <span>Vercel</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p>
                Framework powering our server-rendered pages, API routes, streaming proxies, and Progressive Web App client architecture.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <div className="cta-banner">
          <h2 className="cta-title">Ready for Pure Audio Freedom?</h2>
          <p className="cta-desc">
            Search your favorite songs, paste any YouTube link, or explore curated playlists with instant playback.
          </p>
          <div className="cta-btn-group">
            <Link href="/" className="cta-primary-btn">
              <Play size={18} fill="#ffffff" />
              <span>Start Listening Now</span>
            </Link>
            <Link href="/features" className="cta-secondary-btn">
              <span>Explore All Features</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="seo-footer">
        <p>© {new Date().getFullYear()} YTaudio — Built for the love of music & audio clarity.</p>
        <div className="seo-footer-links">
          <Link href="/" className="seo-footer-link">Player</Link>
          <Link href="/about" className="seo-footer-link">Why YTaudio?</Link>
          <Link href="/features" className="seo-footer-link">Features</Link>
          <Link href="/changelog" className="seo-footer-link">Changelog</Link>
        </div>
      </footer>
    </div>
  );
}
