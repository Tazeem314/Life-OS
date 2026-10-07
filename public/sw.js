const CACHE_NAME = 'lifeos-pwa-v3';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Static assets caching error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('PWA: Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background Sync API Event Handler (for off-screen / background synchronization)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-lifeos-data' || event.tag === 'background-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'TRIGGER_BACKGROUND_SYNC',
            timestamp: Date.now(),
          });
        }
      })
    );
  }
});

// Message listener from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: Never intercept or cache Next.js internal chunks, dev HMR, API routes, or Firebase endpoints.
  // Next.js handles hashed bundle caching natively via HTTP headers.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('webpack-hmr') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('accounts.google.com') ||
    url.origin.includes('googleusercontent.com')
  ) {
    return;
  }

  // HTML Navigation requests: Always Network-First to guarantee fresh SSR & avoid hydration mismatch.
  // Fall back to offline page only when network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Life OS</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}h1{font-size:1.5rem;margin-bottom:0.5rem;}p{color:#a1a1aa;font-size:0.9rem;}</style></head><body><div><h1>Life OS Offline</h1><p>You are currently offline. Open your installed app or reconnect to the internet.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static Assets (Icons, Manifest, Images): Cache-First with Network fallback
  if (
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/favicon.png' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname.startsWith('/pwa-')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
