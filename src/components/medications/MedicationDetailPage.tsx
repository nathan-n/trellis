import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip, Stack, TextField,
  FormControlLabel, Switch, IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import dayjs, { type Dayjs } from 'dayjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { updateMedication, deleteMedication, logAdministration, subscribeAdministrationLog } from '../../services/medicationService';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { Medication, AdministrationLog } from '../../types';
import MedicationDrugInfo from './MedicationDrugInfo';
import ConfirmDialog from '../shared/ConfirmDialog';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function MedicationDetailPage() {
  const { medicationId } = useParams<{ medicationId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();

  const [med, setMed] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AdministrationLog[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [refillDate, setRefillDate] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  // Dose logging
  const [logSkipped, setLogSkipped] = useState(false);
  const [logSkipReason, setLogSkipReason] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [loggingDose, setLoggingDose] = useState(false);

  // Load medication
  useEffect(() => {
    if (!activeCircle || !medicationId) return;
    const unsubscribe = onSnapshot(
      doc(db, 'circles', activeCircle.id, 'medications', medicationId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Medication;
          setMed(data);
          if (!dirtyRef.current) {
            setDosage(data.dosage);
            setFrequency(data.frequency);
            setPrescribingDoctor(data.prescribingDoctor ?? '');
            setPharmacy(data.pharmacy ?? '');
            setPharmacyPhone(data.pharmacyPhone ?? '');
            setStartDate(data.startDate ? dayjs(data.startDate.toDate()) : null);
            setEndDate(data.endDate ? dayjs(data.endDate.toDate()) : null);
            setRefillDate(data.refillDate ? dayjs(data.refillDate.toDate()) : null);
            setNotes(data.notes ?? '');
            setIsActive(data.isActive);
          }
        } else {
          setMed(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [activeCircle?.id, medicationId]);

  // Load administration log
  useEffect(() => {
    if (!activeCircle || !medicationId) return;
    const unsubscribe = subscribeAdministrationLog(
      activeCircle.id,
      medicationId,
      setLogs,
      (err) => console.error('Admin log error:', err)
    );
    return unsubscribe;
  }, [activeCircle?.id, medicationId]);

  const handleSave = async () => {
    if (!activeCircle || !med || !userProfile) return;
    setSaving(true);
    try {
      await updateMedication(activeCircle.id, med.id, userProfile.uid, userProfile.displayName, {
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        prescribingDoctor: prescribingDoctor.trim() || null,
        pharmacy: pharmacy.trim() || null,
        pharmacyPhone: pharmacyPhone.trim() || null,
        startDate: startDate?.toDate() ?? null,
        endDate: endDate?.toDate() ?? null,
        refillDate: refillDate?.toDate() ?? null,
        notes: notes.trim() || null,
        isActive,
      });
      setDirty(false); dirtyRef.current = false;
      showMessage('Medication updated', 'success');
    } catch {
      showMessage('Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCircle || !med || !userProfile) return;
    try {
      await deleteMedication(activeCircle.id, med.id, userProfile.uid, userProfile.displayName);
      showMessage('Medication removed', 'success');
      navigate('/medications');
    } catch {
      showMessage('Failed to remove', 'error');
    }
    setDeleteOpen(false);
  };

  const handleLogDose = async () => {
    if (!activeCircle || !med || !userProfile) return;
    setLoggingDose(true);
    try {
      await logAdministration(activeCircle.id, med.id, userProfile.uid, userProfile.displayName, {
        skipped: logSkipped,
        skipReason: logSkipped ? logSkipReason.trim() : undefined,
        notes: logNotes.trim() || undefined,
      });
      showMessage(logSkipped ? 'Dose skipped — logged' : 'Dose given — logged', 'success');
      setLogSkipped(false);
      setLogSkipReason('');
      setLogNotes('');
    } catch {
      showMessage('Failed to log', 'error');
    } finally {
      setLoggingDose(false);
    }
  };

  const markDirty = () => { setDirty(true); dirtyRef.current = true; };
  const canEdit = role && hasMinRole(role, CircleRole.FAMILY);
  const canDelete = role && hasMinRole(role, CircleRole.ADMIN);
  const isRefillSoon = med?.refillDate && dayjs(med.refillDate.toDate()).diff(dayjs(), 'day') <= 7;

  if (loading) return <LoadingSpinner />;
  if (!med) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6">Medication not found</Typography>
        <Button onClick={() => navigate('/medications')} sx={{ mt: 2 }}>Back to Medications</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/medications')} sx={{ mb: 2 }}>
        Back to Medications
      </Button>

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" fontWeight={600}>{med.name}</Typography>
              {med.openFda?.genericNames?.length ? (
                <Typography variant="body2" color="text.secondary">
                  Generic: {med.openFda.genericNames.join(', ')}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                <Chip label={isActive ? 'Active' : 'Inactive'} size="small" color={isActive ? 'success' : 'default'} />
                {isRefillSoon && (
                  <Chip icon={<WarningAmberIcon />} label={`Refill: ${formatDate(med.refillDate)}`} size="small" color="warning" />
                )}
                {med.openFda?.pharmClassEpc?.map((cls, i) => (
                  <Chip key={i} label={cls} size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {canEdit && dirty && (
                <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              )}
              {canDelete && (
                <IconButton color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Editable Fields */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Details</Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Dosage" value={dosage} onChange={(e) => { setDosage(e.target.value); markDirty(); }} size="small" sx={{ flex: 1 }} disabled={!canEdit} />
              <TextField label="Frequency" value={frequency} onChange={(e) => { setFrequency(e.target.value); markDirty(); }} size="small" sx={{ flex: 1 }} disabled={!canEdit} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Prescribing Doctor" value={prescribingDoctor} onChange={(e) => { setPrescribingDoctor(e.target.value); markDirty(); }} size="small" sx={{ flex: 1 }} disabled={!canEdit} />
              <TextField label="Pharmacy" value={pharmacy} onChange={(e) => { setPharmacy(e.target.value); markDirty(); }} size="small" sx={{ flex: 1 }} disabled={!canEdit} />
            </Box>
            <TextField label="Pharmacy Phone" value={pharmacyPhone} onChange={(e) => { setPharmacyPhone(e.target.value); markDirty(); }} size="small" fullWidth disabled={!canEdit} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker label="Start Date" value={startDate} onChange={(v) => { setStartDate(v); markDirty(); }} slotProps={{ textField: { size: 'small', fullWidth: true } }} disabled={!canEdit} />
              <DatePicker label="End Date" value={endDate} onChange={(v) => { setEndDate(v); markDirty(); }} slotProps={{ textField: { size: 'small', fullWidth: true } }} disabled={!canEdit} />
            </Box>
            <DatePicker label="Refill Date" value={refillDate} onChange={(v) => { setRefillDate(v); markDirty(); }} slotProps={{ textField: { size: 'small', fullWidth: true } }} disabled={!canEdit} />
            <TextField label="Notes" value={notes} onChange={(e) => { setNotes(e.target.value); markDirty(); }} size="small" fullWidth multiline rows={2} disabled={!canEdit} />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => { setIsActive(e.target.checked); markDirty(); }} disabled={!canEdit} />}
              label="Active medication"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Drug Info */}
      {med.openFda && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <MedicationDrugInfo openFda={med.openFda} />
          </CardContent>
        </Card>
      )}

      {/* Log a Dose */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Log a Dose</Typography>
          <Stack spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={logSkipped} onChange={(e) => setLogSkipped(e.target.checked)} />}
              label="Dose was skipped"
            />
            {logSkipped && (
              <TextField label="Reason for skipping" value={logSkipReason} onChange={(e) => setLogSkipReason(e.target.value)} size="small" fullWidth />
            )}
            <TextField label="Notes (optional)" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} size="small" fullWidth />
            <Button variant="contained" onClick={handleLogDose} disabled={loggingDose}>
              {loggingDose ? 'Logging...' : logSkipped ? 'Log Skipped Dose' : 'Log Dose Given'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Administration History */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Administration History ({logs.length})</Typography>
          {logs.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No doses logged yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {logs.map((log) => (
                <Box key={log.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Chip
                    label={log.skipped ? 'Skipped' : 'Given'}
                    size="small"
                    color={log.skipped ? 'warning' : 'success'}
                    sx={{ width: 70 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{log.administeredByName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(log.administeredAt)}
                      {log.skipReason && ` — ${log.skipReason}`}
                      {log.notes && ` — ${log.notes}`}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Remove Medication"
        message={`Remove "${med.name}" from tracking?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        destructive
      />
    </Box>
  );
}
