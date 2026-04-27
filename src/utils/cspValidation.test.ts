/// <reference types="vitest/globals" />
//
// Regression tests for the CSP in firebase.json.
//
// Why these exist (post-mortem reference: POST_MORTEM_2026-04-27_auth-internal-error.md):
//
// During the multi-day auth incident, the CSP was modified incorrectly
// several times — adding directives without authoritative-source
// citation, removing required ones, or making invalid path-restricted
// source expressions. These tests assert the CSP contains every
// directive Firebase Auth + reCAPTCHA + Google sign-in actually need,
// per the official documentation.
//
// Sources:
//   - Firebase Auth redirect best practices:
//     https://firebase.google.com/docs/auth/web/redirect-best-practices
//   - Google reCAPTCHA CSP requirements (FAQ):
//     https://developers.google.com/recaptcha/docs/faq
//   - Firebase Hosting reserved paths (/__/auth/*, /__/firebase/*) —
//     served by Firebase, must be excluded from our restrictive CSP
//     so their inline scripts can run.
//
// If any required directive is removed or broken, this test fails
// before deploy.

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface FirebaseHostingHeader {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

interface FirebaseConfig {
  hosting: {
    headers?: FirebaseHostingHeader[];
  };
}

const config = JSON.parse(
  readFileSync(resolve(__dirname, '../../firebase.json'), 'utf-8')
) as FirebaseConfig;

// Pull the CSP directive value from the catchall '**' header rule.
function getCatchallCSP(): string {
  const catchall = config.hosting.headers?.find((h) => h.source === '**');
  if (!catchall) throw new Error('No catchall ** header rule in firebase.json');
  const csp = catchall.headers.find((h) => h.key === 'Content-Security-Policy');
  if (!csp) throw new Error('No Content-Security-Policy header in catchall rule');
  return csp.value;
}

// Parse a CSP value into a directive map. Each directive maps to its
// list of source expressions.
function parseCSP(csp: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const rule of csp.split(';')) {
    const trimmed = rule.trim();
    if (!trimmed) continue;
    const [directive, ...sources] = trimmed.split(/\s+/);
    out[directive] = sources;
  }
  return out;
}

describe('Firebase Auth CSP requirements', () => {
  const csp = parseCSP(getCatchallCSP());

  describe('script-src (resources Firebase Auth dynamically loads)', () => {
    it("includes 'self' for app's own scripts", () => {
      expect(csp['script-src']).toContain("'self'");
    });

    it('includes https://apis.google.com (gapi client — REQUIRED for signInWithPopup)', () => {
      // The original incident bug: Firebase Auth loads gapi from
      // apis.google.com to coordinate the OAuth iframe. Missing this
      // directive means signInWithPopup throws auth/internal-error.
      expect(csp['script-src']).toContain('https://apis.google.com');
    });

    it('includes https://*.googleapis.com (Firestore + Storage SDKs)', () => {
      expect(csp['script-src']).toContain('https://*.googleapis.com');
    });

    it('includes https://*.gstatic.com (Google static assets, fonts, recaptcha-v2 fallback)', () => {
      expect(csp['script-src']).toContain('https://*.gstatic.com');
    });

    it('includes https://www.google.com/recaptcha/ (reCAPTCHA Enterprise / v2 — App Check)', () => {
      // Per Google reCAPTCHA FAQ. Path-restricted form is preferred.
      expect(csp['script-src']).toContain('https://www.google.com/recaptcha/');
    });
  });

  describe('frame-src (iframes Firebase Auth creates)', () => {
    it("includes 'self' for the auth iframe at ${authDomain}/__/auth/iframe (same-origin under Option 1)", () => {
      // CSP does NOT fall back to default-src when frame-src is
      // explicitly listed, so 'self' must be present or same-origin
      // iframes (which Firebase Auth's helper iframe is, when
      // authDomain is on the app domain) are blocked.
      expect(csp['frame-src']).toContain("'self'");
    });

    it('includes https://accounts.google.com (Google OAuth UI)', () => {
      expect(csp['frame-src']).toContain('https://accounts.google.com');
    });

    it('includes https://*.firebaseapp.com (Firebase project default auth domain)', () => {
      expect(csp['frame-src']).toContain('https://*.firebaseapp.com');
    });

    it('includes https://www.google.com/recaptcha/ (reCAPTCHA challenge UI)', () => {
      expect(csp['frame-src']).toContain('https://www.google.com/recaptcha/');
    });

    it('includes https://recaptcha.google.com/recaptcha/ (international reCAPTCHA)', () => {
      // Per Google reCAPTCHA FAQ.
      expect(csp['frame-src']).toContain('https://recaptcha.google.com/recaptcha/');
    });
  });

  describe('connect-src (XHR/fetch/WebSocket)', () => {
    it("includes 'self' for app's own backend calls", () => {
      expect(csp['connect-src']).toContain("'self'");
    });

    it('includes https://identitytoolkit.googleapis.com (Firebase Auth backend)', () => {
      expect(csp['connect-src']).toContain('https://identitytoolkit.googleapis.com');
    });

    it('includes https://securetoken.googleapis.com (Firebase Auth token refresh)', () => {
      expect(csp['connect-src']).toContain('https://securetoken.googleapis.com');
    });

    it('includes https://www.google.com/recaptcha/ (reCAPTCHA validation calls)', () => {
      expect(csp['connect-src']).toContain('https://www.google.com/recaptcha/');
    });
  });

  describe('img-src', () => {
    it("includes 'self'", () => {
      expect(csp['img-src']).toContain("'self'");
    });

    it('includes https://*.googleusercontent.com (Google profile photos)', () => {
      expect(csp['img-src']).toContain('https://*.googleusercontent.com');
    });

    it('includes https://*.google.com (cleardot.gif / connectivity probes)', () => {
      expect(csp['img-src']).toContain('https://*.google.com');
    });
  });
});

describe('Firebase Hosting reserved paths must bypass our restrictive CSP', () => {
  // Firebase serves /__/auth/handler with inline <script nonce="firebase-auth-helper">
  // tags. Our default-src 'self' + script-src without 'unsafe-inline'
  // would block those scripts and break sign-in. The fix: a more-
  // specific source rule for /__/** that omits CSP entirely so
  // Firebase's own (permissive) headers apply.

  const headers = config.hosting.headers ?? [];

  it('has a /__/** header rule', () => {
    const rule = headers.find((h) => h.source === '/__/**');
    expect(rule).toBeDefined();
  });

  it('the /__/** rule does NOT set Content-Security-Policy', () => {
    const rule = headers.find((h) => h.source === '/__/**');
    expect(rule?.headers.some((h) => h.key === 'Content-Security-Policy')).toBe(false);
  });

  it('the /__/** rule appears BEFORE the catchall ** rule (first-match-wins)', () => {
    const reservedIdx = headers.findIndex((h) => h.source === '/__/**');
    const catchallIdx = headers.findIndex((h) => h.source === '**');
    expect(reservedIdx).toBeGreaterThanOrEqual(0);
    expect(catchallIdx).toBeGreaterThanOrEqual(0);
    expect(reservedIdx).toBeLessThan(catchallIdx);
  });
});
