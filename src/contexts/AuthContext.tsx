import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
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
 * Sign-in flow uses signInWithRedirect across all browsers and devices.
 *
 * Authoritative source (Firebase Auth docs, redirect best practices):
 *   https://firebase.google.com/docs/auth/web/redirect-best-practices
 *
 *   "For browsers that block third-party storage access,
 *    signInWithPopup() may not work correctly. For better cross-browser
 *    compatibility … consider using signInWithRedirect() instead."
 *
 * Why redirect, not popup:
 *   - Chrome 133+ (current is 147+) disables third-party cookies by
 *     default. signInWithPopup needs cross-origin cookies between the
 *     app origin and authDomain to coordinate the popup ↔ opener
 *     handshake — those cookies are blocked, popup fails with
 *     auth/internal-error or completes but doesn't persist to local
 *     storage.
 *   - Mobile Chrome / iOS Safari / installed PWAs have always been
 *     unreliable with popup auth (popup blockers, in-app webview
 *     restrictions, postMessage failures).
 *   - signInWithRedirect carries auth state via URL params on the
 *     return leg from authDomain/__/auth/handler. The app reads state
 *     from its OWN origin's IndexedDB. No cross-origin storage,
 *     no third-party cookies, no postMessage between windows.
 *
 * Persistence is the SDK default (browserLocalPersistence on web —
 * IndexedDB). Per Firebase docs, this is preserved across
 * signInWithRedirect calls automatically. No explicit setPersistence
 * call is needed (and adding one was racing with the auth flow in
 * earlier code).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Process the return leg of signInWithRedirect on every page load.
  // Returns null when there's no pending redirect — safe to call always.
  // The user object is delivered via onAuthStateChanged below; this
  // call's primary purpose is to surface redirect-specific errors.
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('[auth] getRedirectResult error:', err);
    });
  }, []);

  // Single source of truth for profile loading.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Ensure user profile exists.
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

  const signIn = async () => {
    await signInWithRedirect(auth, googleProvider);
    // signInWithRedirect navigates the page to authDomain/__/auth/handler.
    // This Promise never resolves in a normal flow because the page
    // leaves. If we reach the next line, navigation was prevented.
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
