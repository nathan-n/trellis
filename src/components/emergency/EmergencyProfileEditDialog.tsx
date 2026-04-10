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
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';
import MedicationIcon from '@mui/icons-material/Medication';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import dayjs, { type Dayjs } from 'dayjs';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { EmergencyProfile, EmergencyContact, MedicationSummary } from '../../types';
import ChipInput from '../shared/ChipInput';

interface EmergencyProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  profile: EmergencyProfile | null;
}

const relationshipOptions = ['Spouse', 'Son', 'Daughter', 'Sibling', 'Parent', 'Friend', 'Caregiver', 'Other'];

function SectionCard({ icon, label, color, children }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ borderLeft: 4, borderLeftColor: color, borderRadius: 2 }}>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={600} color="inherit">{label}</Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

export default function EmergencyProfileEditDialog({ open, onClose, profile }: EmergencyProfileEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Dayjs | null>(null);
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
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
      setBloodType(profile.bloodType ?? '');
      setAllergies(profile.allergies ?? []);
      setConditions(profile.conditions ?? []);
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
        conditions,
        allergies,
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

          {/* Patient Info */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 2, px: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Patient Information</Typography>
              <Stack spacing={2}>
                <TextField label="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} fullWidth required />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} maxDate={dayjs()} slotProps={{ textField: { fullWidth: true } }} />
                  <TextField label="Blood Type" value={bloodType} onChange={(e) => setBloodType(e.target.value)} sx={{ width: 150, flexShrink: 0 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Allergies */}
          <SectionCard icon={<WarningAmberIcon />} label="Allergies" color="warning.main">
            <ChipInput
              label="Add allergy"
              placeholder="e.g. Penicillin"
              values={allergies}
              onChange={setAllergies}
              chipColor="warning"
            />
          </SectionCard>

          {/* Conditions */}
          <SectionCard icon={<HealthAndSafetyIcon />} label="Conditions" color="secondary.main">
            <ChipInput
              label="Add condition"
              placeholder="e.g. Hypertension"
              values={conditions}
              onChange={setConditions}
              chipColor="secondary"
            />
          </SectionCard>

          {/* Emergency Contacts */}
          <SectionCard icon={<ContactEmergencyIcon />} label="Emergency Contacts" color="primary.main">
            <Stack spacing={1.5}>
              {contacts.map((contact, i) => (
                <Box key={i} sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, position: 'relative' }}>
                  <IconButton
                    size="small"
                    onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Name"
                      size="small"
                      value={contact.name}
                      onChange={(e) => setContacts(contacts.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                      fullWidth
                    />
                    <Autocomplete
                      freeSolo
                      options={relationshipOptions}
                      value={contact.relationship}
                      onInputChange={(_, val) => setContacts(contacts.map((c, j) => j === i ? { ...c, relationship: val } : c))}
                      renderInput={(params) => <TextField {...params} label="Relationship" size="small" />}
                    />
                    <TextField
                      label="Phone"
                      size="small"
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContacts(contacts.map((c, j) => j === i ? { ...c, phone: e.target.value } : c))}
                      fullWidth
                    />
                  </Stack>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setContacts([...contacts, { name: '', relationship: '', phone: '' }])}
              >
                Add Contact
              </Button>
            </Stack>
          </SectionCard>

          {/* Current Medications */}
          <SectionCard icon={<MedicationIcon />} label="Current Medications" color="primary.light">
            <Stack spacing={1.5}>
              {medications.map((med, i) => (
                <Box key={i} sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="Medication"
                    size="small"
                    value={med.name}
                    onChange={(e) => setMedications(medications.map((m, j) => j === i ? { ...m, name: e.target.value } : m))}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    label="Dosage"
                    size="small"
                    value={med.dosage}
                    onChange={(e) => setMedications(medications.map((m, j) => j === i ? { ...m, dosage: e.target.value } : m))}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => setMedications(medications.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setMedications([...medications, { name: '', dosage: '' }])}
              >
                Add Medication
              </Button>
            </Stack>
          </SectionCard>

          {/* Medical & Insurance */}
          <SectionCard icon={<LocalHospitalIcon />} label="Medical & Insurance" color="secondary.main">
            <Stack spacing={2}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">Physician</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Name" size="small" value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Phone" size="small" type="tel" value={physicianPhone} onChange={(e) => setPhysicianPhone(e.target.value)} sx={{ flex: 1 }} />
              </Box>

              <Typography variant="caption" fontWeight={600} color="text.secondary">Hospital</Typography>
              <TextField label="Preferred Hospital" size="small" value={hospitalPreference} onChange={(e) => setHospitalPreference(e.target.value)} fullWidth />
              <TextField label="Hospital Address" size="small" value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} fullWidth />

              <Typography variant="caption" fontWeight={600} color="text.secondary">Insurance</Typography>
              <TextField label="Insurance Provider" size="small" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} fullWidth />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Policy Number" size="small" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Group Number" size="small" value={insuranceGroupNumber} onChange={(e) => setInsuranceGroupNumber(e.target.value)} sx={{ flex: 1 }} />
              </Box>
            </Stack>
          </SectionCard>

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
