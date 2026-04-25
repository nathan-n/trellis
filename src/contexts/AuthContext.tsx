import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getUserProfile } from '../services/authService';
import type { UserProfile } from '../types';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Decide popup vs redirect for Google sign-in.
 *
 * `signInWithPopup` is nicer on desktop but breaks in these environments:
 *   - iOS Safari — ITP blocks the third-party cookies the OAuth popup sets,
 *     popup closes without completing the flow.
 *   - Installed PWAs (standalone display mode) on any OS — popups open in a
 *     browser context that can't postMessage back to the standalone window.
 *   - Mobile Chrome / Samsung Internet / Firefox mobile — flakier than
 *     desktop; even when it works, tab-to-tab handoff feels broken.
 *   - In-app webviews (Facebook, Instagram, LinkedIn) — usually no popup.
 *
 * `signInWithRedirect` navigates the whole page to Google and comes back,
 * so no popup, no cross-window messaging, no third-party-cookie reliance.
 * We use redirect on any mobile or standalone context, popup on desktop.
 */
function shouldUseRedirect(): boolean {
  if (typeof window === 'undefined') return false;

  // Installed PWA (any OS)
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS-specific standalone flag
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;

  // Mobile user-agent sniff. Good enough for the sign-in decision — worst
  // case on a weird UA we fall back to popup, which falls back to redirect
  // on its own if it fails.
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;

  return false;
}

// Error codes from signInWithPopup that mean "the popup path won't work —
// use redirect instead". We fall back on these even on desktop.
//
// auth/internal-error is included because Chrome 133+ disabled
// third-party cookies by default. signInWithPopup needs cross-origin
// cookies between the app origin and authDomain (firebaseapp.com) for
// the hidden auth iframe to coordinate with the popup. With those
// cookies blocked, the SDK throws auth/internal-error within the same
// click event — no popup ever appears. Redirect doesn't depend on
// cross-origin cookies (state is in URL params + app's own
// IndexedDB), so the fallback recovers transparently.
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Pin persistence to local storage explicitly. The SDK defaults to this
  // on web, but being explicit protects against future SDK changes and
  // makes the intent unambiguous: keep the session across reloads.
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('[auth] setPersistence failed:', err);
    });
  }, []);

  // Handle the return leg of signInWithRedirect. If the user just came
  // back from Google, this resolves with a UserCredential; onAuthStateChanged
  // below will also fire, so this call is primarily for surfacing errors.
  // Safe to call on every load — returns null when there's no redirect.
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('[auth] getRedirectResult error:', err);
    });
  }, []);

  // Single source of truth for profile loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Ensure user profile exists
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: (user.email || '').toLowerCase(),
              displayName: user.displayName || '',
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              circleIds: [],
              activeCircleId: null,
            });
          }
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // signIn chooses popup vs redirect based on environment, then falls back
  // to redirect on popup-specific failures even when we initially chose
  // popup (belt-and-suspenders — catches edge cases the UA sniff misses).
  const signIn = async () => {
    if (shouldUseRedirect()) {
      // Fire-and-forget: page will navigate to Google and come back.
      // getRedirectResult + onAuthStateChanged pick up from there.
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code && POPUP_FALLBACK_CODES.has(code)) {
        console.warn(`[auth] popup failed (${code}); falling back to redirect`);
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const logOut = async () => {
    // Clear sensitive cached data (F4: PHI in localStorage)
    try {
      const keysToRemove = Object.keys(localStorage).filter(
        (k) => k.startsWith('emergency_') || k.startsWith('trellis_viewed_') || k.startsWith('trellis_visit_')
      );
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to refresh profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userProfile, loading, signIn, logOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
