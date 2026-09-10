# YTaudio

Audio-first YouTube player — search, queue, stream, and download.

## Setup

```bash
cp .env.example .env
# edit .env: PORT, YTDLP_PATH, FFMPEG_PATH
npm install
npm run dev
```

Open `http://localhost:<PORT>` (default **3000**).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | App listen port |
| `HOSTNAME` | _(optional)_ | Bind host, e.g. `0.0.0.0` for Docker |
| `YTDLP_PATH` | `yt-dlp` | Path to yt-dlp binary (e.g. `/snap/bin/yt-dlp`) |
| `FFMPEG_PATH` | `ffmpeg` | Path to ffmpeg binary |

Example `.env`:

```env
PORT=3000
YTDLP_PATH=/snap/bin/yt-dlp
FFMPEG_PATH=/usr/bin/ffmpeg
```

## Docker

```bash
docker compose up --build
```

Compose reads `.env` for `PORT`, `YTDLP_PATH`, and `FFMPEG_PATH`.
