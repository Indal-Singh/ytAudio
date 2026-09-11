# Changelog

All notable changes to **YTaudio** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-09-11

### 🚀 Added
- **SEO Landing Pages**:
  - `/about`: Detailed breakdown explaining why YTaudio exists (90% data saving, 4x battery life, screen-off listening, interactive FAQs).
  - `/features`: Full 9-feature showcase and comparative matrix (YTaudio vs YouTube Free vs Spotify Free).
  - `/changelog`: Dedicated public release log with release tags and changelog timeline.
- **Search Engine Optimization**:
  - Auto-generated `sitemap.xml` via Next.js metadata route (`/sitemap.ts`).
  - Auto-generated `robots.txt` with crawler instructions and sitemap link.
  - JSON-LD structured data schemas (`WebApplication`, `AboutPage`, `ItemPage`).
  - Web App Manifest (`manifest.webmanifest`) for PWA installation.
- **Hardware & Browser Back Button Navigation**:
  - Intercepts Android hardware Back gesture and browser Back button to dismiss open modals/drawers (Queue Drawer, Video Player, Download Modal, Direct URL, Visualizer, Mobile Sidebar, Search Overlay) without navigating away from the app.
  - Bidirectional search & category browser history (`/?q=...` and `/?category=...`) allowing seamless Back/Forward feed exploration.
  - Generated high-resolution 192x192 and 512x512 maskable PNG icons.
  - Interactive "Install App" banner via `beforeinstallprompt` API and iOS standalone meta tags.
  - App shortcuts for instant access to Trending Music, Lofi Beats, and Podcasts.
- **Environment & Cookie Configuration**:
  - Added `NEXT_PUBLIC_SITE_URL` support across layouts, sitemaps, and crawlers.
  - Added optional `YTDLP_COOKIES_PATH` and `YTDLP_COOKIES_BROWSER` to bypass YouTube bot blocks.
- **Live Progress Download Converter**:
  - Server-Sent Events (SSE) live progress bar from download to FFmpeg remuxing.
  - Automatic temporary file cleanup for downloads older than 5 minutes.

### 🛠️ Fixed
- Fixed PostCSS transformation error caused by `:global()` pseudo-class in `DownloadModal.css`.
- Fixed hook order mismatch in `DownloadModal.tsx`.
- Fixed YouTube search playlist items overflow and query decoding.

---

## [2.0.0] - 2026-09-10

### ⚡ Performance & Modular Architecture
- **Complete Component Refactoring**:
  - Split large monolithic files into dedicated TypeScript components and clean CSS stylesheets.
  - Modularized `QueueDrawer`, `Navbar`, `PlayerBar`, `DownloadModal`, `VideoPlayerModal`, `AudioCard`, `AudioVisualizer`, `Sidebar`, and `DirectUrlModal`.
- **Sub-Hooks Decomposition**:
  - Extracted `usePlayerStorage`, `usePlayerMediaSession`, `usePlayerKeyboard`, and `playerTypes` from `PlayerContext.tsx`.
- **Instant SSR Preloader**:
  - Embedded critical inline CSS and SSR loader skeleton to completely eliminate initial hydration layout shift.

---

## [1.5.0] - 2026-09-08

### 🚀 Added
- **HTML5 MediaSession Integration**:
  - Screen-off lock playback controls (Play, Pause, Next, Prev, Seek, Album Art).
- **Live Spectrum Visualizer**:
  - Web Audio API real-time frequency bar visualizer with neon glow.
- **Direct YouTube Link Importer**:
  - Paste any `youtube.com/watch`, `youtu.be`, or `shorts` link to play or download immediately.
- **Rewind & Queue History**:
  - Persistent playlist management with local storage auto-restore.

---

## [1.0.0] - 2026-09-01

### 🚀 Initial Launch
- Fast, audio-first YouTube streaming powered by `yt-dlp` and `ffmpeg`.
- Debounced live search autocomplete suggestions.
- Genre discovery pills (Lofi, Synthwave, Gaming, Bollywood, Ambient).
- Dark glassmorphism interface with custom audio player bar.
