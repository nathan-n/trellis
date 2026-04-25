import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// authDomain comes from the env var (`<project>.firebaseapp.com`).
//
// Earlier we tried pinning authDomain to the runtime host on the theory
// that storage partitioning would break the OAuth round-trip when app
// and auth handler were on different origins. That was the WRONG
// diagnosis: signInWithRedirect carries auth state via URL params on
// the return leg and reads it from the APP origin's IndexedDB — never
// crosses origins for storage. signInWithPopup uses cross-window
// postMessage, also no storage crossing.
//
// What pinning authDomain to a custom domain DID break:
//   - signInWithPopup creates an iframe at `${authDomain}/__/auth/iframe`.
//     With authDomain = trellis.necaise.co, that iframe is same-origin,
//     gated by the opener's CSP `frame-src` directive. Our CSP listed
//     `frame-src https://accounts.google.com https://*.firebaseapp.com
//     https://*.googleapis.com` — no 'self'. CSP does NOT fall back to
//     default-src when frame-src is explicitly set, so same-origin
//     iframes were blocked → auth/internal-error.
//   - It also required custom-domain redirect URIs in the Google Cloud
//     OAuth client, an extra config step every operator must do.
//
// Sticking with `<project>.firebaseapp.com` (which IS in the existing
// CSP frame-src and IS pre-authorized in the OAuth client) avoids both
// failure modes. Mobile redirect still works because state transfer
// doesn't cross origins.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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
export const RESOLVED_AUTH_DOMAIN = firebaseConfig.authDomain as string;
