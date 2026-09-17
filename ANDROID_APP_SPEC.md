# YTaudio — Native Android (Kotlin & Jetpack Compose) Architecture & API Specification

> **Purpose**: Complete technical specification, API reference, UI/UX design tokens, and feature blueprint to build a native Android music streaming app in Kotlin.

---

## 1. Design System & UI Color Tokens

Use these exact hex codes and tokens in your Jetpack Compose `Theme.kt` / `Color.kt` for 100% visual consistency with the web application.

### 🎨 Color Palette

```kotlin
package dev.indalsingh.ytaudio.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Base Backgrounds (Deep OLED Dark Theme)
val BgBase = Color(0xFF0A0B0E)         // Main scaffold background
val BgSurface = Color(0xFF12141A)      // Cards, bottom sheets, navigation bars
val BgElevated = Color(0xFF1A1E27)     // Modals, popups, elevated dialogs
val BgHover = Color(0xFF242936)        // Item hover / pressed ripple state
val BgActive = Color(0xFF2F3547)       // Selected item / active tab state

// Borders
val BorderSubtle = Color(0x14FFFFFF)   // rgba(255, 255, 255, 0.08) - Card & divider borders
val BorderActive = Color(0x80FF0033)   // rgba(255, 0, 51, 0.5) - Focused / playing item border

// Typography Colors
val TextPrimary = Color(0xFFFFFFFF)    // High emphasis titles & main text
val TextSecondary = Color(0xFF9EA4B4)  // Medium emphasis artist names, timestamps
val TextMuted = Color(0xFF5E6578)      // Low emphasis labels, empty states

// Brand & Accent Colors
val YtRed = Color(0xFFFF0033)          // Primary brand red
val YtRedHover = Color(0xFFFF2A55)     // Pressed state red
val YtRedGlow = Color(0x59FF0033)      // Glow drop-shadow rgba(255, 0, 51, 0.35)
val AccentCyan = Color(0xFF00F0FF)     // "Recommended for you" sparkles, dialogue skip markers
val AccentPurple = Color(0xFF9D4EDD)   // Secondary accent, outro skip markers
val AccentGreen = Color(0xFF00E676)    // SponsorBlock sponsor segment skip color

// Gradients
val GradientBrand = Brush.linearGradient(
    colors = listOf(Color(0xFFFF0033), Color(0xFFFF5252), Color(0xFF9D4EDD))
)
val GradientGlow = Brush.radialGradient(
    colors = listOf(Color(0x26FF0033), Color.Transparent)
)
```

### 📐 Dimensions & Radii

- **Card Corner Radius**: `12.dp` (Small: `6.dp`, Medium: `10.dp`, Large: `16.dp`, Pill/Round: `50.dp`)
- **Bottom Mini-Player Height**: `72.dp` (elevated with glassmorphism blur and 1px top border `BorderSubtle`)
- **Bottom Navigation Bar Height**: `64.dp`
- **Album Art Aspect Ratio**: 16:9 for feed cards (`hqdefault.jpg`), 1:1 square for player/queue (`512x512`)
- **Typography**: Primary font **Outfit**, Monospace font for timestamps **JetBrains Mono**

---

## 2. Backend API Reference

**Base Production URL**: `https://yta.indalsingh.dev` (or local dev `http://10.0.2.2:3000` on Android Emulator).

All endpoints return standard JSON or direct media audio streams.

---

### 2.1. Search Audio Tracks
Search YouTube videos as pure audio tracks with pagination.

- **Endpoint**: `GET /api/search`
- **Query Parameters**:
  - `q` (string, required): Search query (e.g. `coldplay`, `hindi hits`, `trending music`).
  - `limit` (int, optional, default: `16`, max: `50`): Number of items.
  - `start` (int, optional, default: `1`): Pagination start index (1-indexed).
- **Response `200 OK`**:
```json
{
  "success": true,
  "query": "coldplay",
  "start": 1,
  "limit": 16,
  "results": [
    {
      "id": "YykjpeuMNEk",
      "title": "Coldplay - Hymn For The Weekend (Official Video)",
      "uploader": "Coldplay",
      "duration": 260,
      "duration_string": "4:20",
      "view_count": 2154300900,
      "thumbnail": "https://i.ytimg.com/vi/YykjpeuMNEk/hqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=YykjpeuMNEk"
    }
  ]
}
```

---

### 2.2. Live Autocomplete Suggestions
Fast, debounced search suggestions directly matching YouTube completions.

- **Endpoint**: `GET /api/suggest`
- **Query Parameters**:
  - `q` (string, required): Partial query prefix.
- **Response `200 OK`**:
```json
{
  "suggestions": [
    "coldplay hymn for the weekend",
    "coldplay viva la vida",
    "coldplay yellow",
    "coldplay songs",
    "coldplay live"
  ]
}
```

---

### 2.3. Audio Stream Details (Metadata + Stream URL)
Extracts fresh direct audio stream URLs.

- **Endpoint**: `GET /api/stream`
- **Query Parameters**:
  - `id` (string, required): 11-character YouTube video ID.
- **Response `200 OK`**:
```json
{
  "success": true,
  "id": "YykjpeuMNEk",
  "title": "Coldplay - Hymn For The Weekend (Official Video)",
  "uploader": "Coldplay",
  "channel": "Coldplay",
  "duration": 260,
  "duration_string": "4:20",
  "thumbnail": "https://i.ytimg.com/vi/YykjpeuMNEk/hqdefault.jpg",
  "audioUrl": "https://rr3---sn-xxxx.googlevideo.com/videoplayback?...",
  "format": "251 - audio only (medium)",
  "ext": "webm",
  "acodec": "opus"
}
```

---

### 2.4. Audio Streaming Proxy (Live Playback Stream)
Streams high-speed raw audio chunks with full HTTP Range request support (`206 Partial Content`), auto-recovering from expired upstream tokens.

- **Endpoint**: `GET /api/proxy`
- **Query Parameters**:
  - `id` (string, required): YouTube video ID.
  - `url` (string, optional): Warm upstream audio URL if known (bypasses server yt-dlp lookup).
- **Headers**:
  - `Range`: `bytes=0-` (standard audio buffering Range headers handled automatically by ExoPlayer).
- **Response**: `200 OK` or `206 Partial Content` (Binary audio stream `audio/webm` or `audio/mp4`).

---

### 2.5. Related & Similar Songs (Song Radio Generator)
Generates smart radio playlists based on a played song, filtering out near-duplicate uploads.

- **Endpoint**: `GET /api/related`
- **Query Parameters**:
  - `title` (string, required): Song title.
  - `artist` (string, required): Artist / Channel name.
  - `currentId` (string, required): ID of currently playing track (excluded from results).
  - `limit` (int, optional, default: `25`, max: `50`).
- **Response `200 OK`**:
```json
{
  "success": true,
  "results": [
    {
      "id": "1G4isv_F4yI",
      "title": "Coldplay - Paradise (Official Video)",
      "uploader": "Coldplay",
      "duration": 260,
      "duration_string": "4:20",
      "thumbnail": "https://i.ytimg.com/vi/1G4isv_F4yI/hqdefault.jpg",
      "url": "https://www.youtube.com/watch?v=1G4isv_F4yI"
    }
  ]
}
```

---

### 2.6. Personalized Recommendations ("For You" Feed)
Generates a dynamic home feed based on recent listening history seeds.

- **Endpoint**: `POST /api/recommend`
- **Request Body**:
```json
{
  "seeds": [
    { "id": "YykjpeuMNEk", "title": "Hymn For The Weekend", "uploader": "Coldplay" },
    { "id": "fJ9rUzIMcZQ", "title": "Bohemian Rhapsody", "uploader": "Queen" }
  ],
  "limit": 16
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "results": [ ... ],
  "basedOn": ["Coldplay music", "Queen rock"]
}
```

---

### 2.7. SponsorBlock Segments (Dialogue & Ad Auto-Skipping)
Returns crowdsourced timestamps of music story intros, paid sponsors, intros, and outros.

- **Endpoint**: `GET /api/sponsorblock`
- **Query Parameters**:
  - `id` (string, required): YouTube video ID.
- **Response `200 OK`**:
```json
{
  "segments": [
    {
      "category": "music_offtopic",
      "actionType": "skip",
      "segment": [0.0, 32.4],
      "UUID": "a7b8c9d0-...",
      "videoDuration": 310
    },
    {
      "category": "sponsor",
      "actionType": "skip",
      "segment": [180.2, 210.5],
      "UUID": "e1f2g3h4-...",
      "videoDuration": 310
    }
  ]
}
```
- **Supported Categories**:
  - `music_offtopic`: Non-music intro dialogues or story interludes in official music videos.
  - `sponsor`: Paid promotional segments.
  - `intro`: Channel intro cards or branding stingers.
  - `outro`: End credits or end-screens.
  - `selfpromo`: Channel self-promotion or merch plugs.
  - `interaction`: "Like & Subscribe" reminders.

---

### 2.8. Audio & Video Downloader (MP3 Conversion)
Generates real-time transcoded MP3 audio or MP4 video downloads.

- **Endpoint**: `GET /api/download`
- **Query Parameters**:
  - `id` (string, required): Video ID.
  - `type` (string): `formats` | `audio` | `video`.
  - `bitrate` (string, optional, default: `320`): `320` | `256` | `192` | `128`.
  - `title` (string, optional): Filename hint.
- **Inspect Formats**: `GET /api/download?id={id}&type=formats`
  - Returns available MP4 video resolutions (`1080p`, `720p`, `480p`, `360p`).
- **Download MP3**: `GET /api/download?id={id}&type=audio&bitrate=320&title=SongTitle`
  - Streams `audio/mpeg` with `Content-Disposition: attachment; filename="SongTitle.mp3"`.

---

## 3. Native Android Architecture Overview

Build using modern Android recommended architecture:
- **Language**: Kotlin 2.0+
- **UI Toolkit**: Jetpack Compose + Material 3
- **Audio Engine**: **AndroidX Media3 (ExoPlayer)** + `MediaSessionService`
- **Networking**: Retrofit 2 or Ktor Client + Kotlinx Serialization
- **Image Loading**: Coil (Compose `rememberAsyncImagePainter` with disk caching)
- **Local Database**: Room DB (for play history, favorites, rewind playlists, offline cache metadata)
- **Dependency Injection**: Hilt / Koin

```
app/
 ├── data/
 │    ├── api/           // Retrofit interface (YtAudioApi.kt)
 │    ├── model/         // Data classes (Track, SponsorSegment, StreamDetails)
 │    ├── repository/    // AudioRepository, SearchRepository, SponsorRepository
 │    └── local/         // Room DB (HistoryDao, PlaylistDao)
 ├── player/
 │    ├── MusicService.kt          // MediaSessionService (Background + Notification)
 │    ├── AudioCacheManager.kt     // ExoPlayer SimpleCache with LRU eviction
 │    ├── SponsorBlockManager.kt   // Real-time timeline skip observer
 │    └── PlayerController.kt      // StateFlow bridge between UI and MediaController
 ├── ui/
 │    ├── theme/         // Color.kt, Type.kt, Theme.kt
 │    ├── components/    // MiniPlayer, AudioCard, Visualizer, SponsorToast
 │    ├── screens/
 │    │    ├── home/           // Feed with "For You" & Category Chips
 │    │    ├── search/         // Live search & suggestions
 │    │    ├── player/         // Fullscreen Vinyl/Artwork Player Modal
 │    │    ├── queue/          // Up Next bottom sheet with drag-and-drop
 │    │    └── download/       // MP3 download dialog
 └── MainActivity.kt
```

---

## 4. Audio Engine & Cache Implementation (Kotlin / Media3)

### 4.1. Background Playback & MediaSession (`MusicService.kt`)
Use `androidx.media3.session.MediaSessionService`:
1. Keeps playback alive when the screen is locked or app is in background.
2. Displays native Android 13+ Media Style notifications with artwork, play/pause, next, previous, and scrubber bar.
3. Automatically handles audio focus (pauses on incoming phone calls, ducks on navigation alerts, pauses when Bluetooth disconnected with `AudioManager.ACTION_AUDIO_BECOMING_NOISY`).

### 4.2. Instant Resume & Previous 3 Songs Cache (`AudioCacheManager.kt`)
Implement ExoPlayer's native disk caching to replicate the web app's zero-latency resume and 3-song offline storage:

```kotlin
// Singleton ExoPlayer Cache Configuration
val cacheDir = File(context.cacheDir, "media_cache")
val evictor = LeastRecentlyUsedCacheEvictor(25 * 1024 * 1024) // 25 MB cap (Current + 3 previous tracks)
val databaseProvider = StandaloneDatabaseProvider(context)
val simpleCache = SimpleCache(cacheDir, evictor, databaseProvider)

val upstreamFactory = DefaultHttpDataSource.Factory()
    .setUserAgent("YTaudio-Android/2.4.0")

val cacheDataSourceFactory = CacheDataSource.Factory()
    .setCache(simpleCache)
    .setUpstreamDataSourceFactory(upstreamFactory)
    .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

val mediaSourceFactory = DefaultMediaSourceFactory(cacheDataSourceFactory)
val exoPlayer = ExoPlayer.Builder(context)
    .setMediaSourceFactory(mediaSourceFactory)
    .build()
```
**Benefits**:
- Pausing for 5 minutes and playing again reads directly from the local disk cache without network re-extraction.
- Hitting "Previous" plays the cached audio instantly with 0ms buffering.

---

## 5. SponsorBlock Auto-Skip Logic

In your playback loop or Compose `LaunchedEffect`:

```kotlin
class SponsorBlockManager(private val player: Player) {
    var segments by mutableStateOf<List<SponsorSegment>>(emptyList())
    var autoSkipEnabled by mutableStateOf(true)
    var ignoredSegmentUuids = mutableSetOf<String>()

    fun onTimeUpdate(positionMs: Long, onSkipped: (SponsorSegment, Long) -> Unit) {
        if (!autoSkipEnabled || segments.isEmpty()) return
        val currentSec = positionMs / 1000.0

        val match = segments.find { seg ->
            currentSec >= (seg.segment[0] - 0.1) &&
            currentSec < (seg.segment[1] - 0.3) &&
            !ignoredSegmentUuids.contains(seg.UUID)
        }

        if (match != null) {
            val skipToMs = (match.segment[1] * 1000).toLong()
            ignoredSegmentUuids.add(match.UUID)
            player.seekTo(skipToMs)
            onSkipped(match, skipToMs)
        }
    }
}
```

- When skipped, show an animated snackbar toast: `🛡️ Skipped Non-Music Intro • [UNDO]`.
- Clicking **UNDO** seeks back to `match.segment[0]` and adds the UUID to `ignoredSegmentUuids`.

---

## 6. Complete Screen-by-Screen Features

### 🏠 1. Home Feed (`HomeScreen.kt`)
- **Top Bar**: App logo, Search button, Direct Link button, Settings.
- **Category Filter Chips** (Horizontal scroll):
  - `trending music` (Default: "🔥 Trending")
  - `recommended` ("✨ For You" - personal listening history seeds)
  - `lo-fi beats` ("☕ Lo-Fi")
  - `hindi hits` ("🇮🇳 Hindi Hits")
  - `punjabi hits` ("⚡ Punjabi")
  - `hip hop` ("🎤 Hip Hop")
  - `rock music` ("🎸 Rock")
  - `sleep sounds` ("🌙 Sleep & Relax")
- **"Recommended for you" Row**: Horizontal carousel shown on the Home tab when listening history has at least 2 tracks.
- **Trending Music Grid**: 2-column card grid with infinite scroll pagination (`start = videos.size + 1`).

### 🔍 2. Search Screen (`SearchScreen.kt`)
- **Debounced Search Bar**: Queries `/api/suggest?q={query}` every 250ms and shows instant completion chips.
- **Search Results Grid**: Displays search results.
- **Smart Queue Isolation**: Clicking any track in search results **does NOT** dump the raw search results into the playlist. It sets the clicked track as Track 0 and queries `/api/related` to populate a tailored 25-song radio playlist.
- **Quick Action Buttons on Cards**:
  - Card tap: Play immediately.
  - `+ Queue` button: Appends track to end of current queue.
  - `+ Next` button: Inserts track immediately after current track.
  - `Download` button: Opens MP3 downloader dialog.

### 🎵 3. Bottom Mini-Player (`MiniPlayer.kt`)
- Persistent floating bar positioned above the bottom navigation bar (`72.dp` height).
- Blurred surface background with subtle top glowing border.
- **Left**: Square album art thumbnail (`48x48.dp`) with smooth rounded corners.
- **Center**: Marquee scrolling title, artist name, and live playback buffering indicator.
- **Right**: Play/Pause button, Next button, and Queue Drawer toggle button.
- **Bottom**: 2px progress bar indicating current track completion.
- Tap opens the **Fullscreen Player**.

### 🎧 4. Fullscreen Player Screen (`PlayerScreen.kt`)
- **Top Bar**: Down arrow to collapse, title ("Now Playing"), SponsorBlock settings icon, 3-dot menu.
- **Center Artwork**:
  - Vinyl disc rotation animation or high-res album art with dynamic blurred background extracted from album palette.
  - Optional real-time neon FFT Audio Visualizer canvas (cyan & purple gradient bars).
- **Track Details**: Song title, artist/channel name, favorite heart toggle.
- **Interactive Scrubber Bar**:
  - Custom slider with colored SponsorBlock markers (`Cyan` for dialogue, `Green` for sponsors, `Purple` for outros).
  - Current timestamp and total duration in `JetBrains Mono` font.
- **Controls Row**:
  - Shuffle button
  - Skip Backward 10s button
  - Previous Track button
  - **Large Glowing Play/Pause FAB** (`64.dp`, red glow shadow)
  - Next Track button
  - Skip Forward 10s button
  - Loop button (Off / Loop All / Loop One)
- **Bottom Actions**:
  - Speed Selector (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`)
  - Sleep Timer (`15 min`, `30 min`, `45 min`, `1 hour`, `End of track`)
  - Open Queue drawer button
  - Download MP3 button

### 📑 5. Queue & Rewind Playlists (`QueueBottomSheet.kt`)
- **Up Next Tab**:
  - Reorderable list (drag-and-drop handle).
  - Swipe to remove from queue.
  - Auto-Queue status: Shows `"Auto-generating more related songs..."` when 3 or fewer tracks remain.
- **Rewind Playlists Tab**:
  - Preserves the last 30 generated radio sessions.
  - One-tap restore to resume an entire previous playlist from song 0.

### 💾 6. MP3 Downloader Dialog (`DownloadDialog.kt`)
- Fetches `/api/download?id={id}&type=formats`.
- Allows user to choose between:
  - **Audio MP3**: `320 kbps (High Quality)`, `256 kbps`, `192 kbps`, `128 kbps (Data Saver)`.
  - **Video MP4**: `1080p`, `720p`, `480p`, `360p`.
- Integrates with Android's native `DownloadManager` to save directly to `Environment.DIRECTORY_MUSIC` with album metadata and notification progress.

---

## 7. Recommended Android Manifest Permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

*Generated for YTaudio v2.4.0 Native Android Project.*
