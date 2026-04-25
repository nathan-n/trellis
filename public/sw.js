// Bump this on every meaningful SW change. A byte-diff forces browsers
// to treat the SW file as "new" on next navigation, at which point
// skipWaiting + clients.claim (below) activate it immediately and the
// controllerchange listener in main.tsx reloads the tab so the fresh
// code actually runs. Without the version bump, old clients can sit on
// a stale SW indefinitely (browser default SW update check is at most
// every 24h and only on navigation).
const CACHE_NAME = 'trellis-v8';

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

  // Skip Firebase Hosting reserved paths (/__/auth/*, /__/firebase/*).
  // Firebase serves the OAuth handler and init.json from these paths;
  // intercepting them with our own fetch wrapper breaks the auth flow
  // in subtle ways (cookie attribution, redirect chain handling).
  // Let the browser navigate to them natively.
  if (url.pathname.startsWith('/__/')) return;

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
