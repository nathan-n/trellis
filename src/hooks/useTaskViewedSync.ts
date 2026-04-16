import { useEffect, useRef } from 'react';
import { arrayUnion, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCircle } from '../contexts/CircleContext';
import taskViewedStore from './taskViewedStore';

/**
 * Syncs the per-user viewed-task set with the user's member doc in the
 * active circle. Subscribes to `circles/{circleId}/members/{userId}` and
 * merges any remote `viewedTaskIds` into the local store (merge semantics
 * preserve unsynced local writes).
 *
 * On first snapshot after mount, runs a one-time backfill: any task IDs
 * present locally but missing from the member doc are pushed up via
 * arrayUnion. Covers devices that accumulated state before cross-device
 * sync landed. Silent-fails throughout — sync is a nice-to-have, not a
 * hard dependency for the UI.
 *
 * Called once at the app shell level; does not need per-page hooks.
 */
export function useTaskViewedSync(): void {
  const { firebaseUser } = useAuth();
  const { activeCircle } = useCircle();
  const backfilledRef = useRef(false);

  // Reset backfill guard whenever the sync target changes.
  useEffect(() => {
    backfilledRef.current = false;
  }, [activeCircle?.id, firebaseUser?.uid]);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    const circleId = activeCircle?.id;
    if (!uid || !circleId) return;

    const memberRef = doc(db, 'circles', circleId, 'members', uid);
    const localKey = taskViewedStore.getStorageKey(circleId, uid);

    const unsubscribe = onSnapshot(
      memberRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { viewedTaskIds?: string[] } | undefined;
        const remoteIds: string[] = Array.isArray(data?.viewedTaskIds) ? data!.viewedTaskIds : [];

        // Merge remote into local store — preserves any local writes that
        // haven't been persisted to Firestore yet.
        taskViewedStore.setRemoteState(localKey, remoteIds);

        // One-time backfill per (circle, user): push any local IDs that
        // Firestore doesn't know about yet.
        if (!backfilledRef.current) {
          backfilledRef.current = true;
          const localSet = taskViewedStore.getSet(localKey);
          const remoteSet = new Set(remoteIds);
          const missing: string[] = [];
          for (const id of localSet) {
            if (!remoteSet.has(id)) missing.push(id);
          }
          if (missing.length > 0) {
            updateDoc(memberRef, {
              viewedTaskIds: arrayUnion(...missing),
            }).catch(() => { /* silent — sync is best-effort */ });
          }
        }
      },
      () => { /* silent — swallow snapshot errors */ }
    );

    return unsubscribe;
  }, [firebaseUser?.uid, activeCircle?.id]);
}
