/**
 * sw.js — Service Worker
 *
 * Strategy: Cache-First for static assets, Network-First for Firebase SDK CDN.
 * This ensures the app shell loads instantly offline while Firebase SDK calls
 * gracefully fall back to Firestore's built-in IndexedDB offline persistence.
 */

// Increment this when changing SW caching behavior.
// NOTE: this is independent from app "version" and exists purely to manage cache eviction.
const CACHE_VERSION = 'v3';

const PRECACHE_NAME = `notebook-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `notebook-runtime-${CACHE_VERSION}`;
const CACHE_PREFIX = 'notebook-';

// Static assets to cache on initial install
const STATIC_ASSETS = [
  // NOTE: We intentionally do NOT pre-cache '/' because it is subject to hosting rewrites
  // and can behave like an aggressively cached HTML shell.
  '/index.html',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/db.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/icon-512.png',
  '/assets/screenshot-desktop.png',
  '/assets/screenshot-mobile.png',
  '/assets/favicon.jpg'
];

// --- INSTALL ---
// Pre-cache all static assets when the service worker is installed
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// --- ACTIVATE ---
// Clean up old caches from previous service worker versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== PRECACHE_NAME && key !== RUNTIME_CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// --- MESSAGES ---
// Allow the application to trigger activation in a controlled way (e.g. after user clicks "Update").
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- FETCH ---
self.addEventListener('fetch', (event) => {
  // Only handle GET requests; let non-GET (POST/PUT/etc) pass through.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Let Firebase SDK calls and external requests pass through to the network
  // Firestore handles its own IndexedDB-based offline queue
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebase.google.com')
  ) {
    return; // let the browser handle it natively
  }

  // 1) Navigation requests (HTML) — Network-First with offline fallback.
  // This prevents stale UI caused by aggressively cached HTML/app shell.
  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          // Bypass the browser HTTP cache for HTML where possible.
          const response = await fetch(event.request, { cache: 'no-store' });
          return response;
        } catch (err) {
          // Offline fallback: return the app shell.
          const cached = await caches.match('/index.html');
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Only cache same-origin requests (avoid surprising caching of third-party resources).
  if (url.origin !== self.location.origin) return;

  const destination = event.request.destination; // 'script' | 'style' | 'image' | ...
  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(destination);

  // 2) Static assets — Stale-While-Revalidate (fast + auto-updates).
  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        const cached = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        // Return cached immediately if present; otherwise wait for network.
        return cached || (await fetchPromise) || new Response('Offline', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // 3) Everything else (same-origin GET) — Cache-First with network fallback.
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response && response.status === 200) {
          const cache = await caches.open(RUNTIME_CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
