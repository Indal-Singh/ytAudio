const CACHE_NAME = "ytaudio-cache-v2.3.0";
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/about",
  "/features",
  "/changelog",
];

// Install Event: pre-cache application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Pre-caching failed:", err);
      })
  );
});

// Activate Event: clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for dynamic routes, cache-fallback for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API streams, media transfers, or live proxy endpoints
  if (
    url.pathname.startsWith("/api/stream") ||
    url.pathname.startsWith("/api/download") ||
    url.pathname.startsWith("/api/proxy") ||
    url.pathname.startsWith("/api/sponsorblock") ||
    event.request.headers.get("range")
  ) {
    return; // allow browser default network handling
  }

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Stale-while-revalidate for static assets (fonts, images, icons)
  if (
    url.pathname.match(/\.(woff2?|svg|png|jpg|jpeg|webp|ico|css|js)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const resClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Network-first with cache fallback for pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fallback to cached home page
        return caches.match("/");
      })
  );
});
