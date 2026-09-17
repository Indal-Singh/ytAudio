/**
 * Client-side IndexedDB Audio Caching System
 *
 * Provides persistent local caching of audio tracks in the browser.
 * Fixes pause/resume socket timeouts by serving paused/resumed tracks
 * directly from local Blobs, and keeps the current song + up to 3 previous songs
 * cached locally for zero-latency instant replay.
 */

const DB_NAME = "yt_audio_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "audio_tracks";
const MAX_PREVIOUS_SONGS = 3;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedAudioRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  title: string;
  uploader: string;
  duration: number;
  cachedAt: number;
  lastAccessedAt: number;
}

// In-memory registry of active object URLs to prevent memory leaks
const objectUrlRegistry = new Map<string, string>();

/**
 * Open or upgrade the IndexedDB database.
 * Returns null if IndexedDB is not supported (SSR, disabled, etc.).
 */
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("lastAccessedAt", "lastAccessedAt", { unique: false });
          store.createIndex("cachedAt", "cachedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (err) => {
        console.warn("[audioCache] IndexedDB open error:", err);
        resolve(null);
      };
    } catch (err) {
      console.warn("[audioCache] IndexedDB not available:", err);
      resolve(null);
    }
  });
}

/**
 * Retrieve cached audio Blob for a given track ID.
 * Updates lastAccessedAt timestamp to maintain LRU order.
 */
export async function getCachedAudioBlob(id: string): Promise<Blob | null> {
  if (!id) return null;
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as CachedAudioRecord | undefined;
        if (record && record.blob) {
          // Update lastAccessedAt in the background
          record.lastAccessedAt = Date.now();
          store.put(record);
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Check if a track is cached in IndexedDB without loading the entire Blob.
 */
export async function hasCachedAudio(id: string): Promise<boolean> {
  if (!id) return false;
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(id);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Save an audio Blob into IndexedDB.
 */
export async function saveAudioBlob(
  track: { id: string; title?: string; uploader?: string; duration?: number },
  blob: Blob,
  mimeType = "audio/webm"
): Promise<void> {
  if (!track?.id || !blob || blob.size === 0) return;
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const now = Date.now();
      const record: CachedAudioRecord = {
        id: track.id,
        blob,
        mimeType: mimeType || blob.type || "audio/webm",
        size: blob.size,
        title: track.title || "",
        uploader: track.uploader || "",
        duration: track.duration || 0,
        cachedAt: now,
        lastAccessedAt: now,
      };

      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = (e) => {
        console.warn("[audioCache] Failed to save track to cache:", e);
        resolve();
      };
    } catch (err) {
      console.warn("[audioCache] Transaction error while saving track:", err);
      resolve();
    }
  });
}

// In-flight background fetches to avoid duplicate downloads of the same track
const inFlightDownloads = new Map<string, Promise<Blob | null>>();

/**
 * Fetch complete audio from proxy and cache it in IndexedDB.
 * Returns the cached Blob on success.
 */
export async function fetchAndCacheTrack(
  track: { id: string; title?: string; uploader?: string; duration?: number; audioUrl?: string },
  signal?: AbortSignal
): Promise<Blob | null> {
  if (!track?.id) return null;

  // Check if already in IndexedDB
  const existing = await getCachedAudioBlob(track.id);
  if (existing) return existing;

  // Check if download is already in progress
  if (inFlightDownloads.has(track.id)) {
    return inFlightDownloads.get(track.id)!;
  }

  const downloadPromise = (async (): Promise<Blob | null> => {
    try {
      const url = track.audioUrl
        ? `/api/proxy?id=${encodeURIComponent(track.id)}&url=${encodeURIComponent(track.audioUrl)}`
        : `/api/proxy?id=${encodeURIComponent(track.id)}`;

      const res = await fetch(url, {
        signal,
        headers: { Accept: "audio/*, */*" },
      });

      if (!res.ok) {
        console.warn(`[audioCache] Proxy returned status ${res.status} for ${track.id}`);
        return null;
      }

      const blob = await res.blob();
      if (blob.size < 1000) {
        // Unusually small response, likely error payload
        return null;
      }

      await saveAudioBlob(track, blob, res.headers.get("content-type") || blob.type);
      return blob;
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        console.warn(`[audioCache] Failed to cache track ${track.id}:`, err);
      }
      return null;
    } finally {
      inFlightDownloads.delete(track.id);
    }
  })();

  inFlightDownloads.set(track.id, downloadPromise);
  return downloadPromise;
}

/**
 * Prune audio cache:
 * - Keeps the current playing track (if any).
 * - Keeps up to `maxPreviousSongs` (default 3) most recently played songs.
 * - Evicts older songs from IndexedDB.
 * - Also purges songs older than 24 hours if not in the active keep list.
 */
export async function pruneAudioCache(
  currentTrackId?: string | null,
  historyTrackIds: string[] = [],
  maxPreviousSongs = MAX_PREVIOUS_SONGS
): Promise<void> {
  const db = await openDB();
  if (!db) return;

  try {
    // Build set of IDs to preserve
    const keepIds = new Set<string>();
    if (currentTrackId) {
      keepIds.add(currentTrackId);
    }

    // Add up to `maxPreviousSongs` from recent history
    let count = 0;
    for (const id of historyTrackIds) {
      if (!id || id === currentTrackId) continue;
      keepIds.add(id);
      count++;
      if (count >= maxPreviousSongs) break;
    }

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const records = req.result as CachedAudioRecord[];
      if (!records || records.length === 0) return;

      const now = Date.now();
      // Sort records by lastAccessedAt descending
      const sorted = [...records].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

      for (const record of sorted) {
        const isKept = keepIds.has(record.id);
        const isExpired = now - record.lastAccessedAt > MAX_AGE_MS;

        // Delete if not in active keep set OR if it has been kept beyond total allowed capacity (1 current + maxPrevious)
        if (!isKept || isExpired) {
          // Double check: if keepIds didn't fill maxPreviousSongs, keep up to (1 + maxPreviousSongs) total
          if (keepIds.size < maxPreviousSongs + 1 && !isExpired) {
            keepIds.add(record.id);
            continue;
          }

          // Evict record
          store.delete(record.id);
          revokeBlobUrl(record.id);
        }
      }
    };
  } catch (err) {
    console.warn("[audioCache] Error during cache pruning:", err);
  }
}

/**
 * Get or create an in-memory Blob URL for a cached Blob.
 */
export function getOrCreateBlobUrl(id: string, blob: Blob): string {
  if (objectUrlRegistry.has(id)) {
    return objectUrlRegistry.get(id)!;
  }
  const url = URL.createObjectURL(blob);
  objectUrlRegistry.set(id, url);
  return url;
}

/**
 * Get existing memoized Blob URL if already created.
 */
export function getExistingBlobUrl(id: string): string | null {
  return objectUrlRegistry.get(id) || null;
}

/**
 * Revoke and remove a memoized Blob URL to free browser memory.
 */
export function revokeBlobUrl(id: string): void {
  const url = objectUrlRegistry.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    objectUrlRegistry.delete(id);
  }
}

/**
 * Revoke all memoized Blob URLs (e.g. on player unmount or cleanup).
 */
export function revokeAllBlobUrls(): void {
  for (const url of objectUrlRegistry.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  objectUrlRegistry.clear();
}

