/**
 * sw.js — Service Worker
 *
 * Strategy: Cache-First for static assets, Network-First for Firebase SDK CDN.
 * This ensures the app shell loads instantly offline while Firebase SDK calls
 * gracefully fall back to Firestore's built-in IndexedDB offline persistence.
 */

const CACHE_NAME = 'notebook-cache-v1';

// Static assets to cache on initial install
const STATIC_ASSETS = [
  '/',
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
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force activation without waiting for existing tabs to close
  self.skipWaiting();
});

// --- ACTIVATE ---
// Clean up old caches from previous service worker versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
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

// --- FETCH ---
// Cache-First for our own assets; Network-First (pass-through) for Firebase/CDN
self.addEventListener('fetch', (event) => {
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

  // Cache-First strategy for our own static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      // Not in cache — fetch from network and cache it for next time
      return fetch(event.request).then((response) => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned);
        });
        return response;
      });
    })
  );
});
