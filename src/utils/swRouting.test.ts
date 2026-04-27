/// <reference types="vitest/globals" />
//
// Regression tests for service worker fetch-routing rules.
//
// Why these exist (post-mortem reference: POST_MORTEM_2026-04-27_auth-internal-error.md):
//
// The pre-fix SW used `url.hostname.includes('googleapis')` to decide
// whether to bypass third-party requests. That predicate silently
// failed to match `apis.google.com` (different domain — there is no
// `googleapis` substring), so gapi script loads got intercepted via
// `event.respondWith(fetch(request))` and broke under modern Chrome's
// cross-origin handling. Result: every Google sign-in failed with
// `auth/internal-error`. Fix shipped as `d011f16`.
//
// The post-fix predicate is "skip ALL cross-origin requests" — but
// the rule is in `public/sw.js` (not part of the bundle, not directly
// importable in node test context). This file ports the predicate
// here verbatim and exercises it against every URL pattern that
// matters for this app, so any future change to sw.js that re-breaks
// routing fails this test BEFORE deploy.
//
// If you change sw.js, change this file too. Both are the contract.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const SW_ORIGIN = 'https://trellis.necaise.co';

// Mirror of the predicate in public/sw.js (kept in sync by the
// "matches sw.js source" test below — if sw.js diverges from this
// logic the tests fail and someone has to reconcile).
function shouldServiceWorkerHandle(requestUrl: string): boolean {
  const url = new URL(requestUrl);

  // Rule 1: skip all cross-origin requests
  if (url.origin !== SW_ORIGIN) return false;

  // Rule 2: skip Firebase Hosting reserved paths even on our origin
  if (url.pathname.startsWith('/__/')) return false;

  return true;
}

describe('SW fetch routing — cross-origin auth resources MUST bypass', () => {
  // These are the hosts Firebase Auth + Google sign-in actually hit.
  // Every one of them used to be vulnerable to the hostname-substring
  // allowlist bug. Each becomes a permanent regression test.

  it('apis.google.com (gapi client) — the host that triggered the original incident', () => {
    expect(shouldServiceWorkerHandle('https://apis.google.com/js/api.js?onload=__iframefcb774935')).toBe(false);
  });

  it('accounts.google.com (Google OAuth)', () => {
    expect(shouldServiceWorkerHandle('https://accounts.google.com/o/oauth2/auth')).toBe(false);
    expect(shouldServiceWorkerHandle('https://accounts.google.com/o/oauth2/iframe')).toBe(false);
    expect(shouldServiceWorkerHandle('https://accounts.google.com/o/oauth2/postmessageRelay')).toBe(false);
  });

  it('www.google.com/recaptcha (reCAPTCHA scripts)', () => {
    expect(shouldServiceWorkerHandle('https://www.google.com/recaptcha/api.js')).toBe(false);
    expect(shouldServiceWorkerHandle('https://www.google.com/recaptcha/enterprise.js?render=site-key')).toBe(false);
  });

  it('identitytoolkit.googleapis.com (Firebase Auth backend)', () => {
    expect(shouldServiceWorkerHandle('https://identitytoolkit.googleapis.com/v1/accounts:lookup')).toBe(false);
  });

  it('securetoken.googleapis.com (Firebase token refresh)', () => {
    expect(shouldServiceWorkerHandle('https://securetoken.googleapis.com/v1/token')).toBe(false);
  });

  it('firestore.googleapis.com (Firestore RPC)', () => {
    expect(shouldServiceWorkerHandle('https://firestore.googleapis.com/v1/projects/foo/databases/(default)/documents/bar')).toBe(false);
  });

  it('firebaseapp.com (default Firebase Hosting domain — auth handler fallback)', () => {
    expect(shouldServiceWorkerHandle('https://trellis-65440.firebaseapp.com/__/auth/handler')).toBe(false);
  });

  it('firebasestorage.googleapis.com (Firebase Storage)', () => {
    expect(shouldServiceWorkerHandle('https://firebasestorage.googleapis.com/v0/b/trellis-65440.appspot.com/o/test.jpg')).toBe(false);
  });

  it('fonts.googleapis.com (web fonts CSS)', () => {
    expect(shouldServiceWorkerHandle('https://fonts.googleapis.com/css2?family=Inter')).toBe(false);
  });

  it('fonts.gstatic.com (web font files)', () => {
    expect(shouldServiceWorkerHandle('https://fonts.gstatic.com/s/inter/v3/foo.woff2')).toBe(false);
  });

  it('api.fda.gov (third-party API the app calls)', () => {
    expect(shouldServiceWorkerHandle('https://api.fda.gov/drug/label.json?search=donepezil')).toBe(false);
  });
});

describe('SW fetch routing — Firebase Hosting reserved paths MUST bypass', () => {
  // /__/auth/* paths on our own origin must NOT be intercepted.
  // Firebase serves the OAuth handler/iframe and init.json from these.
  // Wrapping them in our fetch-handler detaches them from the
  // browser's natural cookie/redirect-chain context.

  it('/__/auth/handler', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/auth/handler`)).toBe(false);
  });

  it('/__/auth/iframe', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/auth/iframe?apiKey=test&v=12`)).toBe(false);
  });

  it('/__/auth/iframe.js, handler.js, experiments.js (helper scripts)', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/auth/iframe.js`)).toBe(false);
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/auth/handler.js`)).toBe(false);
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/auth/experiments.js`)).toBe(false);
  });

  it('/__/firebase/init.json (project config)', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/__/firebase/init.json`)).toBe(false);
  });
});

describe('SW fetch routing — same-origin app assets MUST be intercepted', () => {
  // The SW's actual job: cache and serve our own bundle for offline support.

  it('navigation request to root', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/`)).toBe(true);
  });

  it('navigation request to a route', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/login`)).toBe(true);
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/today`)).toBe(true);
  });

  it('JS bundle in /assets/', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/assets/index-abc123.js`)).toBe(true);
  });

  it('CSS in /assets/', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/assets/index-abc123.css`)).toBe(true);
  });

  it('manifest.json', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/manifest.json`)).toBe(true);
  });

  it('icon files', () => {
    expect(shouldServiceWorkerHandle(`${SW_ORIGIN}/icons/icon-192.svg`)).toBe(true);
  });
});

describe('SW source consistency — public/sw.js implements the predicate above', () => {
  // If someone changes sw.js without keeping shouldServiceWorkerHandle
  // (above) in sync, this test detects the drift. The predicate must
  // appear textually in the SW source.

  const swSource = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf-8');

  it('contains the cross-origin skip rule', () => {
    // The literal pattern: skip when url.origin !== self.location.origin.
    // Whitespace tolerant.
    expect(swSource).toMatch(/url\.origin\s*!==?\s*self\.location\.origin/);
  });

  it('contains the /__/ path skip rule', () => {
    expect(swSource).toMatch(/url\.pathname\.startsWith\(\s*['"`]\/__\//);
  });

  it('does NOT use brittle hostname-substring allowlists', () => {
    // The pre-fix bug. If anyone re-introduces hostname.includes('googleapis')
    // or similar, fail loudly.
    expect(swSource).not.toMatch(/hostname\.includes\(\s*['"`]googleapis['"`]\s*\)/);
    expect(swSource).not.toMatch(/hostname\.includes\(\s*['"`]firestore['"`]\s*\)/);
    expect(swSource).not.toMatch(/hostname\.includes\(\s*['"`]google\.com['"`]\s*\)/);
  });
});
