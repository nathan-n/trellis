import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { updateUserProfile } from '../services/authService';
import { getCircle, updateMemberLastActive } from '../services/circleService';
import type { Circle, CircleMember } from '../types';
import { CircleRole } from '../constants';

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
  const [loading, setLoading] = useState(true);

  const loadCircle = useCallback(
    async (circleId: string) => {
      setLoading(true);
      const circle = await getCircle(circleId);
      setActiveCircle(circle);
      setLoading(false);
    },
    []
  );

  // Listen for member doc changes in real time
  useEffect(() => {
    if (!userProfile?.activeCircleId || !firebaseUser) {
      setCurrentMember(null);
      setLoading(false);
      return;
    }

    const memberRef = doc(
      db,
      'circles',
      userProfile.activeCircleId,
      'members',
      firebaseUser.uid
    );

    const unsubscribe = onSnapshot(memberRef, (snap) => {
      if (snap.exists()) {
        setCurrentMember({ uid: snap.id, ...snap.data() } as CircleMember);
      } else {
        setCurrentMember(null);
      }
    });

    return unsubscribe;
  }, [userProfile?.activeCircleId, firebaseUser]);

  // Load circle when activeCircleId changes and track last active
  useEffect(() => {
    if (userProfile?.activeCircleId) {
      loadCircle(userProfile.activeCircleId);
      if (firebaseUser) {
        updateMemberLastActive(userProfile.activeCircleId, firebaseUser.uid).catch(() => {});
      }
    } else {
      setActiveCircle(null);
      setLoading(false);
    }
  }, [userProfile?.activeCircleId, loadCircle, firebaseUser]);

  const switchCircle = async (circleId: string) => {
    if (firebaseUser) {
      await updateUserProfile(firebaseUser.uid, { activeCircleId: circleId });
      await loadCircle(circleId);
    }
  };

  const refreshCircle = async () => {
    if (userProfile?.activeCircleId) {
      await loadCircle(userProfile.activeCircleId);
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
