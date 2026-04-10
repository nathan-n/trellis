import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { updateUserProfile } from '../services/authService';
import { getCircle, updateMemberLastActive } from '../services/circleService';
import type { Circle, CircleMember } from '../types';
import type { CircleRole } from '../constants';

interface CircleContextValue {
  activeCircle: Circle | null;
  currentMember: CircleMember | null;
  role: CircleRole | null;
  loading: boolean;
  switchCircle: (circleId: string) => Promise<void>;
  refreshCircle: () => Promise<void>;
}

const CircleContext = createContext<CircleContextValue | null>(null);

export function CircleProvider({ children }: { children: ReactNode }) {
  const { userProfile, firebaseUser } = useAuth();
  const [activeCircle, setActiveCircle] = useState<Circle | null>(null);
  const [currentMember, setCurrentMember] = useState<CircleMember | null>(null);
  const [circleLoaded, setCircleLoaded] = useState(false);
  const [memberLoaded, setMemberLoaded] = useState(false);
  const switchResolveRef = useRef<(() => void) | null>(null);

  const activeCircleId = userProfile?.activeCircleId;

  // Unified loading: only false when BOTH circle and member are resolved
  const loading = activeCircleId ? (!circleLoaded || !memberLoaded) : false;

  // Load circle document
  useEffect(() => {
    if (!activeCircleId) {
      setActiveCircle(null);
      setCircleLoaded(true);
      return;
    }

    setCircleLoaded(false);
    getCircle(activeCircleId)
      .then((circle) => {
        setActiveCircle(circle);
        setCircleLoaded(true);
      })
      .catch(() => {
        setActiveCircle(null);
        setCircleLoaded(true);
      });

    // Track last active
    if (firebaseUser) {
      updateMemberLastActive(activeCircleId, firebaseUser.uid).catch(() => {});
    }
  }, [activeCircleId, firebaseUser]);

  // Listen for member doc
  useEffect(() => {
    if (!activeCircleId || !firebaseUser) {
      setCurrentMember(null);
      setMemberLoaded(true);
      return;
    }

    setMemberLoaded(false);
    const memberRef = doc(db, 'circles', activeCircleId, 'members', firebaseUser.uid);

    const unsubscribe = onSnapshot(
      memberRef,
      (snap) => {
        if (snap.exists()) {
          setCurrentMember({ uid: snap.id, ...snap.data() } as CircleMember);
        } else {
          setCurrentMember(null);
        }
        setMemberLoaded(true);
      },
      () => {
        setCurrentMember(null);
        setMemberLoaded(true);
      }
    );

    return unsubscribe;
  }, [activeCircleId, firebaseUser]);

  // Resolve switchCircle promise when both are loaded
  useEffect(() => {
    if (circleLoaded && memberLoaded && switchResolveRef.current) {
      switchResolveRef.current();
      switchResolveRef.current = null;
    }
  }, [circleLoaded, memberLoaded]);

  // Timeout: if loading takes >10s, force loaded to prevent infinite spinner
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setCircleLoaded(true);
      setMemberLoaded(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const switchCircle = (circleId: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!firebaseUser) { resolve(); return; }

      // Set up resolver that fires when both circle + member are loaded
      switchResolveRef.current = resolve;

      // Reset loaded flags so loading becomes true
      setCircleLoaded(false);
      setMemberLoaded(false);

      // Update user profile which triggers the effects above
      await updateUserProfile(firebaseUser.uid, { activeCircleId: circleId });

      // Also directly load the circle (don't wait for effect to detect change)
      try {
        const circle = await getCircle(circleId);
        setActiveCircle(circle);
        setCircleLoaded(true);
      } catch {
        setCircleLoaded(true);
      }
    });
  };

  const refreshCircle = async () => {
    if (activeCircleId) {
      const circle = await getCircle(activeCircleId);
      setActiveCircle(circle);
    }
  };

  return (
    <CircleContext.Provider
      value={{
        activeCircle,
        currentMember,
        role: currentMember?.role ?? null,
        loading,
        switchCircle,
        refreshCircle,
      }}
    >
      {children}
    </CircleContext.Provider>
  );
}

export function useCircle(): CircleContextValue {
  const context = useContext(CircleContext);
  if (!context) {
    throw new Error('useCircle must be used within a CircleProvider');
  }
  return context;
}
