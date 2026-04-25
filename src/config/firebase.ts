import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Pick the Firebase Auth `authDomain` at runtime.
 *
 * Why this is dynamic: a Firebase project gets two free Hosting domains
 * automatically — `<project>.web.app` and `<project>.firebaseapp.com`.
 * Both serve the same content. The `authDomain` config controls where
 * the OAuth handler page lives. If users access the app on `.web.app`
 * but `authDomain` points at `.firebaseapp.com` (the env-var default),
 * those are *different origins* — and since Chrome 113 (May 2023)
 * storage is partitioned across origins. The redirect flow can't share
 * its session state back to the app, and sign-in silently fails.
 *
 * Symptoms when this is wrong:
 *  - Desktop Chrome works (third-party cookies historically allowed)
 *  - Android Chrome / iOS Safari / private windows / Brave fail
 *  - signInWithPopup pops then closes with no result
 *  - signInWithRedirect comes back without auth state set
 *
 * Fix: pin authDomain to whichever Firebase Hosting domain the user
 * is currently on. Both `.web.app` and `.firebaseapp.com` are
 * pre-authorized as OAuth redirect URIs by Firebase automatically, so
 * either is a valid choice — we just need to MATCH the runtime origin.
 *
 * Localhost dev and custom domains fall back to the env-var setting.
 * Custom domains require explicit setup in Firebase Console + Google
 * Cloud OAuth client to be authorized as redirect URIs.
 */
function resolveAuthDomain(): string {
  const fallback = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string;
  if (typeof window === 'undefined') return fallback;
  const host = window.location.hostname;

  // Localhost dev: Vite doesn't serve /__/auth/handler. Use the
  // configured firebaseapp.com domain — Firebase pre-authorizes
  // localhost as a valid sign-in origin against that handler.
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return fallback;
  }

  // Production: pin authDomain to the runtime host so the OAuth
  // handler (`<authDomain>/__/auth/handler`) lives on the same
  // eTLD+1 as the app. Same-site = same Chrome storage partition,
  // so the redirect round-trip can share its session state.
  // Works for:
  //   - `<project>.web.app` and `<project>.firebaseapp.com` (auto-
  //     authorized by Firebase)
  //   - Custom domains attached to Firebase Hosting (must also be
  //     listed in Firebase Console → Auth → Settings → Authorized
  //     domains, otherwise sign-in returns auth/unauthorized-domain)
  return host;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Expose the resolved domain for the diagnostic panel.
export const RESOLVED_AUTH_DOMAIN = firebaseConfig.authDomain;
