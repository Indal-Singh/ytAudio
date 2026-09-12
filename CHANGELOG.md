# Changelog

All notable changes to **YTaudio** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-09-12

### 🚀 Added
- **SponsorBlock Integration (Auto-Skip & Manual Controls)**:
  - Direct integration with the crowdsourced [SponsorBlock API](https://sponsor.ajay.app) for YouTube.
  - Automatically skips non-music story dialogues, intro bumper animations, paid sponsor reads, outros/end-screens, self-promotions, and subscribe reminders.
  - Interactive toast notification with an instant **Undo** button (`🛡️ Skipped Non-Music Intro • [Undo]`) allowing listeners to restore any skipped section.
  - **SponsorBlock Controls Modal**: Configurable master toggle, mode selector (**Auto-Skip** vs **Manual Prompt**), and category-level customization.
  - **Timeline Segment Markers**: Color-coded stripes along the audio scrubber across desktop and mobile fullscreen players (cyan for dialogue, green for sponsors, purple for outros).
  - High-performance server-side caching route `/api/sponsorblock` with 1-hour in-memory cache and silent fallback.
- **Credits & Open-Source Acknowledgements**:
  - Dedicated open-source credits section highlighting [SponsorBlock](https://sponsor.ajay.app) by Ajay Ramachandran, [yt-dlp](https://github.com/yt-dlp/yt-dlp), [FFmpeg](https://ffmpeg.org), [Next.js](https://nextjs.org), and [Lucide Icons](https://lucide.dev).

---

## [2.2.0] - 2026-09-12

### 🚀 Added
- **PWA Screen-Off Continuous Autoplay**:
  - Pre-buffers upcoming playlist/feed items directly into audio memory queue upon track selection.
  - Synchronous `ended` playback transition complying with iOS Safari and Android Chrome background media autoplay policies.
  - Seamless loop/wrap-around queue protection ensuring uninterrupted background playback during deep device sleep.
- **Unified `SeoNavbar` Component**:
  - Reusable responsive navigation header for `/about`, `/features`, and `/changelog`.
  - Glassmorphic backdrop blur, interactive active link indicators, and one-tap player launch button.
  - Full-screen animated mobile drawer with Android hardware back-button listener, safe-area top inset padding, and body scroll lock.
- **Open Source Licensing & Metadata**:
  - Added official permissive open-source MIT License (`LICENSE`).
  - Enhanced GitHub repository metadata, tags, and documentation.

### 🎨 Improved & Fixed
- **Mobile Feed & Search Layout**:
  - Fixed mobile listing Y-axis overflow caused by active card overlay expansion and unconstrained viewport heights.
  - Pinned application shell to dynamic viewport height (`100dvh`) eliminating double scrollbars and layout shifts.
  - Clamped mobile card title heights and hidden overflowing overlay text on mobile thumbnails.
- **Responsive Landing Pages**:
  - Fixed timeline dot alignment on mobile `/changelog` with dynamic CSS offset calculations.
  - Added horizontal swipe indicator badge and smooth touch scrolling for comparison matrix on `/features`.
  - Fluid typography (`clamp`) and touch-calibrated grids across `/about`.

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
