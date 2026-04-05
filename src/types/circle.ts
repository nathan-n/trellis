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
}

export interface CircleMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: CircleRole;
  joinedAt: Timestamp;
  invitedByUid: string;
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
