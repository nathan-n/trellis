import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
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

  // Timeout: if loading takes >10s, force loaded to prevent infinite spinner
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setCircleLoaded(true);
      setMemberLoaded(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const switchCircle = async (circleId: string): Promise<void> => {
    if (!firebaseUser) return;

    // Load both circle and member directly — don't wait for effect chain
    setCircleLoaded(false);
    setMemberLoaded(false);

    // Fire all three in parallel: update profile, load circle, load member
    const [, circle, memberSnap] = await Promise.all([
      updateUserProfile(firebaseUser.uid, { activeCircleId: circleId }),
      getCircle(circleId).catch(() => null),
      getDoc(doc(db, 'circles', circleId, 'members', firebaseUser.uid)).catch(() => null),
    ]);

    setActiveCircle(circle);
    setCircleLoaded(true);

    if (memberSnap?.exists()) {
      setCurrentMember({ uid: memberSnap.id, ...memberSnap.data() } as CircleMember);
    } else {
      setCurrentMember(null);
    }
    setMemberLoaded(true);
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
