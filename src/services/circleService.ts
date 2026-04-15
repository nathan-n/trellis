import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CircleRole, InvitationStatus } from '../constants';
import type { Circle, CircleMember, Invitation } from '../types';

export async function createCircle(
  userId: string,
  userEmail: string,
  userName: string,
  userPhoto: string | null,
  data: { name: string; patientName: string; patientDob?: Date | null; timezone?: string }
): Promise<string> {
  const circleId = crypto.randomUUID();
  const circleRef = doc(db, 'circles', circleId);

  await setDoc(circleRef, {
    name: data.name,
    patientName: data.patientName,
    patientDob: data.patientDob ? Timestamp.fromDate(data.patientDob) : null,
    createdByUid: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    memberCount: 1,
    settings: {
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Add creator as admin member
  const memberRef = doc(db, 'circles', circleId, 'members', userId);
  await setDoc(memberRef, {
    uid: userId,
    email: userEmail,
    displayName: userName,
    photoURL: userPhoto,
    role: CircleRole.ADMIN,
    joinedAt: serverTimestamp(),
    invitedByUid: userId,
  });

  // Update user's circle list
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    circleIds: arrayUnion(circleId),
    activeCircleId: circleId,
    updatedAt: serverTimestamp(),
  });

  return circleId;
}

export async function getCircle(circleId: string): Promise<Circle | null> {
  const snap = await getDoc(doc(db, 'circles', circleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Circle;
}

export async function getCircleMembers(circleId: string): Promise<CircleMember[]> {
  const snap = await getDocs(collection(db, 'circles', circleId, 'members'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as CircleMember);
}

export async function updateMemberRole(
  circleId: string,
  memberId: string,
  role: CircleRole
): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'members', memberId), { role });
}

export async function removeMember(circleId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'members', memberId));

  // Atomic decrement — no read needed, no race condition
  await updateDoc(doc(db, 'circles', circleId), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  // Remove circle from user's list and clear activeCircleId if it points here
  const userRef = doc(db, 'users', memberId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  await updateDoc(userRef, {
    circleIds: arrayRemove(circleId),
    ...(userData?.activeCircleId === circleId ? { activeCircleId: null } : {}),
    updatedAt: serverTimestamp(),
  });
}

// Invitations
export async function createInvitation(
  circleId: string,
  circleName: string,
  inviteeEmail: string,
  invitedByUid: string,
  invitedByName: string,
  role: CircleRole
): Promise<string> {
  const invitationId = crypto.randomUUID();
  const invRef = doc(db, 'invitations', invitationId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  await setDoc(invRef, {
    circleId,
    circleName,
    inviteeEmail: inviteeEmail.toLowerCase(),
    invitedByUid,
    invitedByName,
    role,
    status: InvitationStatus.PENDING,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    acceptedAt: null,
  });

  return invitationId;
}

export async function getPendingInvitations(email: string): Promise<Invitation[]> {
  const q = query(
    collection(db, 'invitations'),
    where('inviteeEmail', '==', email.toLowerCase()),
    where('status', '==', InvitationStatus.PENDING)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invitation);
}

export async function getInvitation(invitationId: string): Promise<Invitation | null> {
  const snap = await getDoc(doc(db, 'invitations', invitationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invitation;
}

export async function acceptInvitation(
  invitationId: string,
  userId: string,
  userEmail: string,
  userName: string,
  userPhoto: string | null
): Promise<void> {
  const invitation = await getInvitation(invitationId);
  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    throw new Error('Invitation not found or already processed');
  }

  // Mark invitation as accepted FIRST (invitee has permission for this)
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: InvitationStatus.ACCEPTED,
    acceptedAt: serverTimestamp(),
  });

  // Add user as circle member
  const memberRef = doc(db, 'circles', invitation.circleId, 'members', userId);
  await setDoc(memberRef, {
    uid: userId,
    email: userEmail,
    displayName: userName,
    photoURL: userPhoto,
    role: invitation.role,
    joinedAt: serverTimestamp(),
    invitedByUid: invitation.invitedByUid,
  });

  // Update user's circle list
  await updateDoc(doc(db, 'users', userId), {
    circleIds: arrayUnion(invitation.circleId),
    activeCircleId: invitation.circleId,
    updatedAt: serverTimestamp(),
  });

  // Note: memberCount increment skipped — requires admin role in Firestore rules.
  // The member list is the source of truth; memberCount is denormalized and may drift.
  // A Cloud Function could handle this atomically in the future.
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: InvitationStatus.DECLINED,
  });
}

export async function getCircleInvitations(circleId: string): Promise<Invitation[]> {
  const q = query(
    collection(db, 'invitations'),
    where('circleId', '==', circleId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invitation);
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: InvitationStatus.EXPIRED,
  });
}

export async function updateMemberLastActive(circleId: string, userId: string): Promise<void> {
  const memberRef = doc(db, 'circles', circleId, 'members', userId);
  await updateDoc(memberRef, { lastActiveAt: serverTimestamp() });
}
