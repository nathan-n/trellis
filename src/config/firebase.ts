import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// authDomain pinned to the app's primary custom domain.
//
// Firebase Auth — redirect best practices (authoritative source):
//   https://firebase.google.com/docs/auth/web/redirect-best-practices
//
//   "Update your Firebase config to use your primary custom domain as
//    authDomain. Update OAuth providers' authorized redirect URIs to
//    include https://example.com/__/auth/handler. Add the domain to
//    Firebase Console's authorized domains list."
//
// Why this matters: starting Chrome 115+ (we're on 147+ now), modern
// browsers block third-party storage access. With authDomain on a
// different eTLD+1 (e.g., firebaseapp.com) than the app
// (trellis.necaise.co), the auth iframe Firebase uses to coordinate
// signInWithPopup is partitioned and can't access the cookies/state it
// needs — sign-in throws auth/internal-error synchronously, no popup
// ever opens.
//
// With authDomain on the SAME root domain as the app, the iframe is
// same-site (same eTLD+1), no partitioning, sign-in works.
//
// Hardcoded rather than env-var driven: this value is part of the
// auth contract (with the OAuth client + Firebase authorized domains)
// and can't be changed casually. Hardcoding keeps it in lockstep with
// firebase.json's CSP (which must also reference this domain).
//
// Localhost dev still works — Firebase pre-authorizes localhost as a
// sign-in origin against any project's auth handler, so popup flows
// from localhost completing through trellis.necaise.co/__/auth/handler
// is supported by the SDK.
const AUTH_DOMAIN = 'trellis.necaise.co';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: AUTH_DOMAIN,
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
