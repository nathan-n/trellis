import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Passive service worker registration only.
//
// We previously had a "self-heal" flow here (registration.update on
// load + setInterval + a `controllerchange` listener that reloaded the
// page when a new SW took control). It was meant to prevent users
// from running stale bundles, but the forced reload could fire
// mid-sign-in — the popup would be orphaned by the navigation and the
// auth flow died silently. Removed because correctness > eager
// freshness; browsers update SWs naturally on next navigation anyway.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* SW is non-critical */ });
  });
}
