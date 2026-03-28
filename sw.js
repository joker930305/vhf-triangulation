// Service Worker for VHF Triangulation PWA
const CACHE_NAME = 'vhf-tri-v1';

// Core app + CDN dependencies — cached on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // React 18
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  // Babel (for JSX transform)
  'https://unpkg.com/@babel/standalone/babel.min.js',
  // Tailwind CSS CDN
  'https://cdn.tailwindcss.com',
  // Leaflet
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Map tile domains — cached on first use
const TILE_DOMAINS = [
  'server.arcgisonline.com',
  'basemaps.cartocdn.com',
  'a.basemaps.cartocdn.com',
  'b.basemaps.cartocdn.com',
  'c.basemaps.cartocdn.com',
  'd.basemaps.cartocdn.com',
];

// ─── Install: precache core resources ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching core resources');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch strategy ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Map tiles: Cache-first, fall back to network, store on first fetch
  if (TILE_DOMAINS.some((d) => url.hostname.includes(d))) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // Everything else: Network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh copy
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
