import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createMedication, updateMedication } from '../../services/medicationService';
import type { Medication } from '../../types';

interface MedicationCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  medication?: Medication | null;
}

export default function MedicationCreateEditDialog({ open, onClose, medication }: MedicationCreateEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [refillDate, setRefillDate] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');

  const isEdit = Boolean(medication);

  useEffect(() => {
    if (medication) {
      setName(medication.name);
      setDosage(medication.dosage);
      setFrequency(medication.frequency);
      setPrescribingDoctor(medication.prescribingDoctor ?? '');
      setPharmacy(medication.pharmacy ?? '');
      setPharmacyPhone(medication.pharmacyPhone ?? '');
      setStartDate(medication.startDate ? dayjs(medication.startDate.toDate()) : null);
      setEndDate(medication.endDate ? dayjs(medication.endDate.toDate()) : null);
      setIsActive(medication.isActive);
      setRefillDate(medication.refillDate ? dayjs(medication.refillDate.toDate()) : null);
      setNotes(medication.notes ?? '');
    } else {
      setName(''); setDosage(''); setFrequency('');
      setPrescribingDoctor(''); setPharmacy(''); setPharmacyPhone('');
      setStartDate(null); setEndDate(null); setIsActive(true);
      setRefillDate(null); setNotes('');
    }
  }, [medication, open]);

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim() || !frequency.trim() || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        prescribingDoctor: prescribingDoctor.trim() || null,
        pharmacy: pharmacy.trim() || null,
        pharmacyPhone: pharmacyPhone.trim() || null,
        startDate: startDate?.toDate() ?? null,
        endDate: endDate?.toDate() ?? null,
        isActive,
        refillDate: refillDate?.toDate() ?? null,
        notes: notes.trim() || null,
      };

      if (isEdit && medication) {
        await updateMedication(activeCircle.id, medication.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Medication updated', 'success');
      } else {
        await createMedication(activeCircle.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Medication added', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save medication error:', err);
      showMessage('Failed to save medication', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Medication Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
          <TextField label="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} fullWidth required placeholder="e.g. 10mg" />
          <TextField label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} fullWidth required placeholder="e.g. Twice daily, Every 8 hours" />
          <TextField label="Prescribing Doctor" value={prescribingDoctor} onChange={(e) => setPrescribingDoctor(e.target.value)} fullWidth />
          <TextField label="Pharmacy" value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} fullWidth />
          <TextField label="Pharmacy Phone" value={pharmacyPhone} onChange={(e) => setPharmacyPhone(e.target.value)} fullWidth />
          <DatePicker label="Start Date" value={startDate} onChange={setStartDate} slotProps={{ textField: { fullWidth: true } }} />
          <DatePicker label="Refill Date" value={refillDate} onChange={setRefillDate} slotProps={{ textField: { fullWidth: true } }} />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
          <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active medication" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name.trim() || !dosage.trim() || !frequency.trim() || saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Medication'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
