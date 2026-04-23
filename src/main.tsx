import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ── Service Worker registration + self-healing update flow ───────────────────
//
// Problem we're solving:
//   Earlier versions of /sw.js used a cache-first strategy and intercepted
//   Firebase/Google API calls, which could break login on devices that still
//   had the old SW registered (users had to manually unregister + reload to
//   escape). skipWaiting + clients.claim in the new SW help the new worker
//   activate, but without a `controllerchange` listener here the page keeps
//   running the OLD JS that was already loaded — new code never actually
//   takes effect until the user closes every tab.
//
// What this does:
//   1. Register the SW (as before).
//   2. Call registration.update() on every page load so the browser checks
//      for a new sw.js immediately — not up to 24h later.
//   3. Listen for `controllerchange`. When it fires, a new SW took control
//      of this page, which means fresher asset routing is now available.
//      Reload once (guarded via sessionStorage to avoid refresh loops).
//   4. Kick off a periodic update check every 30 min so long-lived tabs
//      (someone leaves the app open overnight) still pick up new deploys.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Force an update check on every load.
        registration.update().catch(() => { /* best-effort */ });

        // Periodic update check — catches deploys for long-open tabs.
        setInterval(() => {
          registration.update().catch(() => { /* best-effort */ });
        }, 30 * 60 * 1000);
      })
      .catch(() => { /* ignore — SW is non-critical */ });

    // When a new SW takes control, reload so the fresh code is actually in
    // memory. The sessionStorage guard prevents a loop if something about
    // the new SW keeps claiming clients on every load.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      if (sessionStorage.getItem('sw-reloaded') === '1') return;
      reloading = true;
      sessionStorage.setItem('sw-reloaded', '1');
      window.location.reload();
    });

    // Clear the guard when the page is closed so a future session can
    // reload again if needed.
    window.addEventListener('pagehide', () => {
      sessionStorage.removeItem('sw-reloaded');
    });
  });
}
