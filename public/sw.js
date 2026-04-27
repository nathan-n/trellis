// Bump this on every meaningful SW change. A byte-diff forces browsers
// to treat the SW file as "new" on next navigation, at which point
// skipWaiting + clients.claim (below) activate it immediately.
const CACHE_NAME = 'trellis-v16';

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

  const url = new URL(request.url);

  // Skip ALL cross-origin requests. The SW's purpose is to cache and
  // serve OUR app's assets — third-party services (Google APIs,
  // Firebase backends, gapi, reCAPTCHA, fonts CDNs, etc.) must be
  // handled directly by the browser. Intercepting them with
  // event.respondWith(fetch(request)) can break cross-origin script
  // execution in modern browsers (opaque responses, third-party
  // cookie partitioning, redirect chain attribution).
  //
  // Earlier SW versions tried to enumerate skip rules per hostname
  // (googleapis, firestore, fda.gov, etc.). That approach silently
  // failed for hostnames we forgot — most recently apis.google.com,
  // which doesn't match `.includes('googleapis')`. Catching all
  // cross-origin in one rule eliminates the whole class of bugs.
  if (url.origin !== self.location.origin) return;

  // Skip Firebase Hosting reserved paths on our own origin. Firebase
  // serves the OAuth handler/iframe at /__/auth/*, the project init
  // config at /__/firebase/init.json. Intercepting these with our
  // wrapper detaches the response from the browser's natural
  // navigation/cookie context and breaks the auth flow.
  if (url.pathname.startsWith('/__/')) return;

  // Navigation requests (HTML): always go to network. This prevents a
  // stale index.html (which references a deleted JS chunk) from being
  // served from cache.
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

  // Same-origin static assets (JS/CSS/fonts/images under /assets/ etc):
  // network-first with cache fallback for offline support.
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
