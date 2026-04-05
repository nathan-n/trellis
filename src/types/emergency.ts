import { Timestamp } from 'firebase/firestore';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicationSummary {
  name: string;
  dosage: string;
}

export interface EmergencyProfile {
  patientName: string;
  dateOfBirth: Timestamp;
  conditions: string[];
  allergies: string[];
  bloodType: string | null;
  currentMedications: MedicationSummary[];
  emergencyContacts: EmergencyContact[];
  hospitalPreference: string | null;
  hospitalAddress: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceGroupNumber: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  updatedAt: Timestamp;
  updatedByUid: string;
}
