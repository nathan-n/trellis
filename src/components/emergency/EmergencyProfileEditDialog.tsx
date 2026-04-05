import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  Box,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs, { type Dayjs } from 'dayjs';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { EmergencyProfile, EmergencyContact, MedicationSummary } from '../../types';

interface EmergencyProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  profile: EmergencyProfile | null;
}

export default function EmergencyProfileEditDialog({ open, onClose, profile }: EmergencyProfileEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Dayjs | null>(null);
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [medications, setMedications] = useState<MedicationSummary[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [hospitalPreference, setHospitalPreference] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceGroupNumber, setInsuranceGroupNumber] = useState('');
  const [physicianName, setPhysicianName] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');

  useEffect(() => {
    if (profile) {
      setPatientName(profile.patientName);
      setDateOfBirth(profile.dateOfBirth ? dayjs(profile.dateOfBirth.toDate()) : null);
      setConditions(profile.conditions?.join(', ') ?? '');
      setAllergies(profile.allergies?.join(', ') ?? '');
      setBloodType(profile.bloodType ?? '');
      setMedications(profile.currentMedications ?? []);
      setContacts(profile.emergencyContacts ?? []);
      setHospitalPreference(profile.hospitalPreference ?? '');
      setHospitalAddress(profile.hospitalAddress ?? '');
      setInsuranceProvider(profile.insuranceProvider ?? '');
      setInsurancePolicyNumber(profile.insurancePolicyNumber ?? '');
      setInsuranceGroupNumber(profile.insuranceGroupNumber ?? '');
      setPhysicianName(profile.physicianName ?? '');
      setPhysicianPhone(profile.physicianPhone ?? '');
    } else if (activeCircle) {
      setPatientName(activeCircle.patientName);
    }
  }, [profile, open, activeCircle]);

  const handleSave = async () => {
    if (!activeCircle || !userProfile) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'circles', activeCircle.id, 'emergencyProfile', 'profile'), {
        patientName,
        dateOfBirth: dateOfBirth ? Timestamp.fromDate(dateOfBirth.toDate()) : null,
        conditions: conditions.split(',').map((c) => c.trim()).filter(Boolean),
        allergies: allergies.split(',').map((a) => a.trim()).filter(Boolean),
        bloodType: bloodType.trim() || null,
        currentMedications: medications.filter((m) => m.name.trim()),
        emergencyContacts: contacts.filter((c) => c.name.trim()),
        hospitalPreference: hospitalPreference.trim() || null,
        hospitalAddress: hospitalAddress.trim() || null,
        insuranceProvider: insuranceProvider.trim() || null,
        insurancePolicyNumber: insurancePolicyNumber.trim() || null,
        insuranceGroupNumber: insuranceGroupNumber.trim() || null,
        physicianName: physicianName.trim() || null,
        physicianPhone: physicianPhone.trim() || null,
        updatedAt: serverTimestamp(),
        updatedByUid: userProfile.uid,
      });
      showMessage('Emergency profile saved', 'success');
      onClose();
    } catch (err) {
      console.error('Save emergency profile error:', err);
      showMessage('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Emergency Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} fullWidth required />
          <DatePicker label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} maxDate={dayjs()} slotProps={{ textField: { fullWidth: true } }} />
          <TextField label="Conditions (comma-separated)" value={conditions} onChange={(e) => setConditions(e.target.value)} fullWidth placeholder="Alzheimer's, Diabetes, Hypertension" />
          <TextField label="Allergies (comma-separated)" value={allergies} onChange={(e) => setAllergies(e.target.value)} fullWidth placeholder="Penicillin, Sulfa drugs" />
          <TextField label="Blood Type" value={bloodType} onChange={(e) => setBloodType(e.target.value)} sx={{ width: 150 }} />

          <Divider><Typography variant="caption">Emergency Contacts</Typography></Divider>
          {contacts.map((c, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField label="Name" size="small" value={c.name} onChange={(e) => setContacts(contacts.map((cc, j) => j === i ? { ...cc, name: e.target.value } : cc))} sx={{ flex: 1 }} />
              <TextField label="Relationship" size="small" value={c.relationship} onChange={(e) => setContacts(contacts.map((cc, j) => j === i ? { ...cc, relationship: e.target.value } : cc))} sx={{ flex: 1 }} />
              <TextField label="Phone" size="small" value={c.phone} onChange={(e) => setContacts(contacts.map((cc, j) => j === i ? { ...cc, phone: e.target.value } : cc))} sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => setContacts([...contacts, { name: '', relationship: '', phone: '' }])}>Add Contact</Button>

          <Divider><Typography variant="caption">Current Medications</Typography></Divider>
          {medications.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField label="Medication" size="small" value={m.name} onChange={(e) => setMedications(medications.map((mm, j) => j === i ? { ...mm, name: e.target.value } : mm))} sx={{ flex: 1 }} />
              <TextField label="Dosage" size="small" value={m.dosage} onChange={(e) => setMedications(medications.map((mm, j) => j === i ? { ...mm, dosage: e.target.value } : mm))} sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => setMedications(medications.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => setMedications([...medications, { name: '', dosage: '' }])}>Add Medication</Button>

          <Divider><Typography variant="caption">Medical & Insurance</Typography></Divider>
          <TextField label="Primary Physician" value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} fullWidth />
          <TextField label="Physician Phone" value={physicianPhone} onChange={(e) => setPhysicianPhone(e.target.value)} fullWidth />
          <TextField label="Preferred Hospital" value={hospitalPreference} onChange={(e) => setHospitalPreference(e.target.value)} fullWidth />
          <TextField label="Hospital Address" value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} fullWidth />
          <TextField label="Insurance Provider" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} fullWidth />
          <TextField label="Policy Number" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} fullWidth />
          <TextField label="Group Number" value={insuranceGroupNumber} onChange={(e) => setInsuranceGroupNumber(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!patientName.trim() || saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
