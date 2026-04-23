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
  Autocomplete,
  CircularProgress,
  Typography,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createMedication, updateMedication } from '../../services/medicationService';
import { useOpenFdaSearch } from '../../hooks/useOpenFdaSearch';
import { fetchDrugDetails, checkInteractions, type OpenFdaSearchResult } from '../../services/openFdaService';
import type { Medication, OpenFdaMetadata } from '../../types';
import InteractionWarningDialog from './InteractionWarningDialog';
import type { InteractionWarning } from '../../services/openFdaService';

interface MedicationCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  medication?: Medication | null;
  existingMeds?: Medication[];
}

export default function MedicationCreateEditDialog({ open, onClose, medication, existingMeds = [] }: MedicationCreateEditDialogProps) {
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
  const [openFda, setOpenFda] = useState<OpenFdaMetadata | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [interactionWarnings, setInteractionWarnings] = useState<InteractionWarning[]>([]);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);

  const { results: searchResults, loading: searchLoading } = useOpenFdaSearch(name);
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
      setOpenFda(medication.openFda ?? null);
    } else {
      setName(''); setDosage(''); setFrequency('');
      setPrescribingDoctor(''); setPharmacy(''); setPharmacyPhone('');
      setStartDate(null); setEndDate(null); setIsActive(true);
      setRefillDate(null); setNotes(''); setOpenFda(null);
    }
  }, [medication, open]);

  const handleDrugSelect = async (value: OpenFdaSearchResult | string | null) => {
    if (!value || typeof value === 'string') {
      setOpenFda(null);
      return;
    }

    setName(value.brandName);
    setFetchingDetails(true);
    const details = await fetchDrugDetails(value.splId);
    setOpenFda(details);
    setFetchingDetails(false);
  };

  const buildData = () => ({
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
    openFda,
  });

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim() || !frequency.trim() || !activeCircle || !userProfile) return;

    // Check interactions before creating (not on edit)
    if (!isEdit && existingMeds.length > 0) {
      const warnings = await checkInteractions(openFda, name.trim(), existingMeds);
      if (warnings.length > 0) {
        setInteractionWarnings(warnings);
        setWarningDialogOpen(true);
        return;
      }
    }

    await doSave();
  };

  const doSave = async () => {
    if (!activeCircle || !userProfile) return;
    setSaving(true);
    try {
      const data = buildData();
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

  const handleWarningProceed = () => {
    setWarningDialogOpen(false);
    doSave();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Drug name with openFDA autocomplete */}
            <Autocomplete
              freeSolo
              options={searchResults}
              getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : `${opt.brandName} (${opt.genericName})`
              }
              loading={searchLoading}
              inputValue={name}
              onInputChange={(_, value) => setName(value)}
              onChange={(_, value) => handleDrugSelect(value)}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Medication Name"
                  required
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {(searchLoading || fetchingDetails) && <CircularProgress size={18} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />

            {openFda && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {openFda.pharmClassEpc.map((cls, i) => (
                  <Chip
                    key={i}
                    label={cls}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', color: 'slate.dark', borderColor: 'slate.main' }}
                  />
                ))}
                {openFda.genericNames.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Generic: {openFda.genericNames.join(', ')}
                  </Typography>
                )}
              </Stack>
            )}

            {/* Dosage with suggestions from openFDA */}
            <Autocomplete
              freeSolo
              options={openFda?.availableDosages ?? []}
              inputValue={dosage}
              onInputChange={(_, value) => setDosage(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Dosage"
                  required
                  placeholder="e.g. 10mg"
                  helperText={openFda?.availableDosages?.length ? 'Suggested dosages from FDA data' : undefined}
                />
              )}
            />

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

      <InteractionWarningDialog
        open={warningDialogOpen}
        warnings={interactionWarnings}
        onProceed={handleWarningProceed}
        onCancel={() => setWarningDialogOpen(false)}
      />
    </>
  );
}
