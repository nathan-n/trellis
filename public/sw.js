const CACHE_NAME = 'trellis-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL caches on every activation — clean slate per deploy
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase/Google API calls entirely
  const url = new URL(request.url);
  if (url.hostname.includes('googleapis') || url.hostname.includes('firestore')) return;
  if (url.hostname.includes('fda.gov')) return;

  // Navigation requests (HTML): ALWAYS go to network, never serve from cache
  // This prevents stale index.html from referencing deleted JS chunks
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Only use cache as last resort when completely offline
        return caches.match('/index.html').then((cached) =>
          cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } })
        );
      })
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          cached || new Response('Offline', { status: 503 })
        )
      )
  );
});
