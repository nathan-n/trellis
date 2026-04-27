# Post-Mortem: `auth/internal-error` on sign-in (2026-04-22 → 2026-04-27)

**Status:** Resolved
**Resolution commit:** `d011f16` — `fix(sw): skip ALL cross-origin requests`
**Severity:** P0 — sign-in fully broken on every browser/device on production
**Duration of brokenness:** ~5 days (longer for some users — silent breakage that compounded with each "fix" attempt)
**Scope of damage:** Every user attempting Google sign-in. Existing sessions persisted; new sign-ins failed.

---

## Executive Summary

A `service worker` fetch handler that was supposed to skip Firebase/Google API requests used a brittle hostname-substring allowlist (`url.hostname.includes('googleapis')`). The allowlist did not match `apis.google.com` (different domain — there's no `googleapis` substring). Every Google sign-in started by loading `https://apis.google.com/js/api.js` (Google's "gapi" client). The SW intercepted that load via `event.respondWith(fetch(request))`, which on modern Chrome breaks cross-origin script execution because the response is opaque (no-cors mode) and detached from the browser's natural cookie/redirect-chain context. The browser fired `onerror` on the script element. Firebase Auth's SDK wrapped this as `auth/internal-error` and the SDK never opened the OAuth popup.

The bug had likely existed since the original SW shipped (commit `ea76b97`), but lay dormant because earlier Chrome versions tolerated the SW pattern. Chrome 133+ third-party storage / cookie partitioning made the SW intercept fatal.

The actual fix is one line — `if (url.origin !== self.location.origin) return;` — that replaces the hostname allowlist with an exhaustive rule.

---

## Timeline

| Time | Event |
|---|---|
| Sometime pre-session | SW shipped with hostname-substring allowlist; bug existed but worked in older Chrome |
| 2026-04-22 | User reports "can't login on other computers, only this one" |
| Same day | I shipped 9 sequential commits guessing at: signInWithPopup→Redirect, dynamic authDomain, CSP /__/** override, SW self-heal, popup fallback chain, etc. None addressed the actual cause. |
| 2026-04-23 | User reports `redirect_uri_mismatch` from Google. I told them to update OAuth client config. |
| 2026-04-25 | User reports `auth/internal-error`. I claimed CSP was the problem and shipped CSP changes. |
| 2026-04-25 | User explicitly told me to *"ultrathink and stop messing around with lazy low effort attempts."* I reverted some changes. Sign-in still broken. |
| 2026-04-27 | User asked for a holistic review. I produced 3 plans, user picked Plan B (revert SW reload). Didn't fix it. |
| 2026-04-27 | User explicitly requested authoritative-source-driven fix. I fetched Firebase docs, implemented "Option 1" (custom-domain authDomain). Closer but still failed because of the SW issue. |
| 2026-04-27 | I added reCAPTCHA CSP directives — well-intentioned but wrong-tree. |
| 2026-04-27 | I added enhanced diagnostics (`event.target.src`) to the panel. **First time** the user could see exactly which URL failed: `apis.google.com/js/api.js`. |
| 2026-04-27 | Inspected SW skip rules. Realized `apis.google.com` doesn't match `.includes('googleapis')`. Shipped the one-line fix. Sign-in restored. |

---

## Root Cause Analysis

### Layer 1 — The technical bug

`public/sw.js` had this pre-fix:

```js
if (url.hostname.includes('googleapis') || url.hostname.includes('firestore')) return;
if (url.hostname.includes('fda.gov')) return;
```

This was meant to "let third-party requests bypass the SW." It worked for `*.googleapis.com` and `firestore.googleapis.com` (covered by the wildcard) and `api.fda.gov`. It silently failed for:

- `apis.google.com` — gapi client (Firebase Auth iframe coordination)
- `accounts.google.com` — Google OAuth endpoints
- `www.google.com/recaptcha/*` — reCAPTCHA scripts
- `securetoken.google.com` — Firebase Auth token refresh
- Any other `*.google.com` host

When the SW intercepted the script load via `event.respondWith(fetch(request))`:
- Browsers fetch cross-origin scripts in `no-cors` mode by default.
- The SW's `fetch(request)` returns an opaque response (status 0, no headers readable).
- The browser receives an opaque response from `respondWith` and treats the script as "loaded" but the script element's `error` event fires due to the opacity-induced execution failure under modern Chrome's stricter cross-origin policy.

Firebase Auth's `loadJS` function wraps this `error` event as `auth/internal-error` with `customData` set to the DOM Event itself (`{isTrusted: true}` after JSON serialization, which is why our diagnostic initially showed nothing useful).

### Layer 2 — Why the bug persisted

1. **Brittle allowlist pattern.** Hostname-substring matching silently fails for any hostname not enumerated. The pattern is impossible to validate without testing every cross-origin host the app ever touches.

2. **No tests for SW routing behavior.** No unit test verified what hosts the SW would intercept vs. skip. No integration test exercised the full sign-in flow.

3. **Browser policy drift.** The bug likely worked initially. Chrome 133+ third-party storage partitioning made it fatal. Without monitoring or a smoke test, the silent regression went undetected until a user reported it.

4. **The SW was off the suspect list.** It had been "working" for months. I assumed it was correct without reading it, repeatedly, until the diagnostic forced me to look directly.

### Layer 3 — Why diagnostics took so long

The SDK swallowed the underlying cause:

- The original error message was `Firebase: Error (auth/internal-error)` — generic.
- `customData` on the error was a DOM Event object. `JSON.stringify(event)` returns `{"isTrusted": true}` because most Event properties are non-enumerable.
- Without explicit access to `event.target.src`, the failing URL was invisible.

I should have surfaced `event.target.src` from the start. I didn't.

---

## Why My Troubleshooting Was Slow

This is the harder analysis. Listed in order of severity:

### 1. I theorized instead of verifying

I shipped 8+ commits before fetching Firebase's official docs. Every commit was a hypothesis-driven guess. The user's quote that nailed this:

> *"laziness I feel is what landed us here in the first place by doing things in a perceived easier, equivalent way vs the correct way"*

When I finally read Firebase's redirect-best-practices doc, it contradicted what I'd been telling the user. I had claimed Firebase recommends `signInWithRedirect` — the doc explicitly recommends `signInWithPopup`. I claimed "Option 2" was a subdomain — Firebase's documented Option 2 is a reverse proxy. My mental model and Firebase's actual guidance were not the same, and I never checked.

### 2. I added diagnostics piecemeal

The diagnostic panel grew across multiple commits:
- Commit 1: basic environment dump (origin, authDomain, storage)
- Commit 2: Test Sign In button
- Commit 3: error code + message
- Commit 4: customData (logged as `{isTrusted: true}` — useless)
- Commit 5: target.src extraction — **finally** showed the failing URL

Each commit shipped, deployed, the user tested, reported it didn't help. With proper diagnostics from commit 1, the URL would have been visible from the first failure report.

### 3. I shipped fixes faster than the user could test them

When a "fix" didn't work, I'd ship another fix without confirming the first one had reached the browser cache and been retested. The user's confusion — "is this on the new code or the old code?" — was a direct result. With each new commit I was essentially asking the user to run a controlled experiment whose conditions kept changing.

### 4. I trusted my mental model over inspection

I assumed:
- Firebase recommends signInWithRedirect (false)
- The CSP wasn't an issue (false initially, then partially true)
- The SW was working correctly (false — actually broken since day one)
- Storage partitioning broke signInWithRedirect (false — that flow doesn't share storage cross-origin)

Every one of these was a confident claim I never verified.

### 5. I conflated configuration layers

When the user reported a problem, I'd suggest fixes at the wrong layer — telling them to update OAuth client redirect URIs when the bug was in our SW, etc. The five layers (Firebase Console → OAuth Client → CSP → SW → app code) all need to align, and I never built a clear mental map of which layer each symptom pointed at.

---

## Action Items

### Done

- ✅ One-line SW fix: `if (url.origin !== self.location.origin) return;`
- ✅ Removed brittle hostname allowlist
- ✅ Removed SW reload-on-controllerchange (orphans in-flight popups)
- ✅ Restored AuthContext to pre-session form (signInWithPopup, no popup-fallback chain)
- ✅ Added enhanced diagnostic panel with click counter + event log + target.src extraction

### Shipping with this post-mortem

- ✅ **Regression tests** (new): SW routing tests, CSP validation tests
- ✅ **Memory updates**: explicit anti-pattern catalog, layer map for Firebase Auth, "verify before declaring" rule
- ✅ **Post-mortem doc** (this file) committed to the repo

### Future considerations (not blocking)

- E2E smoke test that exercises sign-in on every deploy (Playwright/Puppeteer hitting `/login`, clicking sign-in, verifying no `auth/internal-error`). Would catch this class of bug pre-deploy. Sized to a separate task because it requires CI infra changes.
- Monitor for `auth/internal-error` in production via Sentry/Crashlytics (this app doesn't currently have error monitoring wired up).

---

## Detection / Prevention

The new tests cover:

1. **`src/utils/__tests__/swRouting.test.ts`** — verifies the SW's intercept predicate produces the correct decision for every relevant URL pattern. If a future change to `sw.js` breaks routing for `apis.google.com` (or any other Google/auth host), this test fails before deploy.

2. **`src/utils/__tests__/cspValidation.test.ts`** — parses `firebase.json`'s CSP and asserts every directive Firebase Auth + reCAPTCHA + Google sign-in needs is present. If anyone removes a required directive, this test fails before deploy.

`npm run build` runs tests before TypeScript build before Vite build. Tests gate the deploy. A regression in either area now blocks merging to main.

---

## Postscript — for the next time something looks like this

1. **Surface the actual error and resource URL on turn one.** Empty catches and bare error codes are blockers. The diagnostic panel saved this incident; it should exist for any class of issue we expect to debug remotely.

2. **Read the docs before proposing the fix, not after the fix fails.** WebFetch + the official skill packs exist for this. Cite the source URL in the commit message.

3. **The SW is part of the surface area.** It can silently break cross-origin behavior. It's on the suspect list for any "load failure" symptom.

4. **Allowlists by string-substring on hostnames are brittle.** Use exhaustive predicates (origin checks) or skip-by-default-with-explicit-passthroughs.

5. **Don't ship more fixes than the user can test.** Each fix should produce a falsifiable signal. If two consecutive fixes don't change the symptom, stop and re-diagnose.
