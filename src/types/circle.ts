import { Timestamp } from 'firebase/firestore';
import { CircleRole, InvitationStatus } from '../constants';

export interface Circle {
  id: string;
  name: string;
  patientName: string;
  patientDob: Timestamp | null;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memberCount: number;
  settings: {
    timezone: string;
  };
  // Soft delete — admin can mark circle for deletion; excluded from lookups.
  // Hard purge of subcollections/storage is deferred to a future Cloud Function.
  deletedAt?: Timestamp | null;
  deletedByUid?: string | null;
}

export interface CircleMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: CircleRole;
  joinedAt: Timestamp;
  invitedByUid: string;
  lastActiveAt: Timestamp | null;
}

export interface Invitation {
  id: string;
  circleId: string;
  circleName: string;
  inviteeEmail: string;
  invitedByUid: string;
  invitedByName: string;
  role: CircleRole;
  status: InvitationStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt: Timestamp | null;
}
