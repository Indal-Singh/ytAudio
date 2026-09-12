# 🎵 YTaudio — Pure YouTube Audio Streamer & Background Player

[![Next.js](https://img.shields.io/badge/Next.js-15%20%2F%2016-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-00f0ff?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-yta.indalsingh.dev-ff0033?style=flat-square&logo=google-chrome)](https://yta.indalsingh.dev)

> **Stream YouTube music with your screen locked, save up to 90% mobile data and battery, visualize sound in real time, and download crystal-clear 320kbps MP3s.**

---

## ✨ Key Features

- 📱 **Screen-Off Background Playback**: Integrated with the HTML5 `MediaSession` API. Lock your phone, put it in your pocket, and control music playback from your lock screen or smartwatch.
- 📶 **90% Mobile Data Savings**: Pure Opus/AAC audio container extraction (only ~3MB–5MB per song instead of 120MB+ for 1080p video frames).
- 📊 **Real-Time Spectrum Visualizer**: Hardware-accelerated dynamic frequency audio bars powered by the HTML5 Web Audio API.
- ⬇️ **Offline MP3 / MP4 Downloader**: Download crystal-clear 320kbps MP3 audio or 1080p MP4 video with real-time Server-Sent Events (SSE) progress streaming.
- 🔗 **Direct YouTube URL Importer**: Paste any YouTube video, Shorts, or youtu.be shortlink to resolve and play instantly.
- 📑 **Dynamic Queue & Rewind**: Add tracks on the fly, reorder songs, and easily revisit previously played tracks.
- ⌨️ **Desktop Keyboard Controls**: Space (Play/Pause), Left/Right arrows (Seek 5s), Up/Down arrows (Volume), M (Mute/Unmute).
- 🎨 **Dark Cyberpunk Glassmorphism UI**: High-fidelity dark aesthetic with responsive layouts across mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | Modular Vanilla CSS (Glassmorphism & Design Tokens) |
| **Audio Engine** | Web Audio API & HTML5 `MediaSession` API |
| **Media Extraction** | `yt-dlp` & `FFmpeg` |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20 or higher
- **yt-dlp**: Installed and accessible in your system PATH
- **ffmpeg**: Installed and accessible in your system PATH

### 2. Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Indal-Singh/ytAudio.git
cd ytAudio

# Copy sample environment configuration
cp .env.example .env

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## ⚙️ Environment Variables

Configure `.env` as needed:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Web server listening port |
| `HOSTNAME` | `0.0.0.0` | Bind address (useful for Docker containers) |
| `NEXT_PUBLIC_SITE_URL` | `https://yta.indalsingh.dev` | Canonical metadata and OpenGraph domain |
| `YTDLP_PATH` | `yt-dlp` | Absolute path to the `yt-dlp` executable |
| `FFMPEG_PATH` | `ffmpeg` | Absolute path to the `ffmpeg` executable |
| `YTDLP_COOKIES_PATH` | _(optional)_ | Path to `cookies.txt` for restricted streams |
| `YTDLP_COOKIES_BROWSER`| _(optional)_ | Browser profile to extract cookies from (e.g., `chrome`) |

---

## 🐳 Docker Deployment

Run with Docker Compose:

```bash
docker compose up --build -d
```

---

## 🙌 Credits & Open-Source Acknowledgements

YTaudio is built with gratitude upon these incredible open-source projects and communities:

- **[SponsorBlock](https://sponsor.ajay.app)** by [Ajay Ramachandran](https://github.com/ajayyy) — The crowdsourced database and public API powering automatic skipping of non-music dialogues, story scenes, sponsor reads, and outros.
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — The world-class command-line audio and video extraction utility.
- **[FFmpeg](https://ffmpeg.org)** — The multimedia framework powering server-side audio extraction, remuxing, and 320kbps MP3 conversion.
- **[Next.js](https://nextjs.org)** by Vercel — The React framework powering SSR, route handlers, and PWA capabilities.
- **[Lucide Icons](https://lucide.dev)** — Clean, modern iconography across the player and controls.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
