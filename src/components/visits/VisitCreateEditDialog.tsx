import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { VisitStatus } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useCircleMembers } from '../../hooks/useCircleMembers';
import { createVisit, updateVisit } from '../../services/visitService';
import type { Visit } from '../../types';

interface VisitCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  visit?: Visit | null;
  defaultDate?: Date | null;
}

export default function VisitCreateEditDialog({ open, onClose, visit, defaultDate }: VisitCreateEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const { members } = useCircleMembers();
  const [saving, setSaving] = useState(false);

  const [caregiverUid, setCaregiverUid] = useState('');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(VisitStatus.SCHEDULED);

  const isEdit = Boolean(visit);

  useEffect(() => {
    if (visit) {
      setCaregiverUid(visit.caregiverUid);
      setStartTime(dayjs(visit.startTime.toDate()));
      setEndTime(dayjs(visit.endTime.toDate()));
      setNotes(visit.notes ?? '');
      setStatus(visit.status);
    } else {
      setCaregiverUid(userProfile?.uid ?? '');
      if (defaultDate) {
        const d = dayjs(defaultDate);
        setStartTime(d.hour(9).minute(0));
        setEndTime(d.hour(17).minute(0));
      } else {
        setStartTime(null);
        setEndTime(null);
      }
      setNotes('');
      setStatus(VisitStatus.SCHEDULED);
    }
  }, [visit, open, userProfile]);

  const handleSave = async () => {
    if (!caregiverUid || !startTime || !endTime || !activeCircle || !userProfile) return;

    const caregiver = members.find((m) => m.uid === caregiverUid);
    if (!caregiver) return;

    setSaving(true);
    try {
      const data = {
        caregiverUid,
        caregiverName: caregiver.displayName,
        startTime: startTime.toDate(),
        endTime: endTime.toDate(),
        notes: notes.trim() || null,
        status,
      };

      if (isEdit && visit) {
        await updateVisit(activeCircle.id, visit.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Visit updated', 'success');
      } else {
        await createVisit(activeCircle.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Visit scheduled', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save visit error:', err);
      showMessage('Failed to save visit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Visit' : 'Schedule Visit'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Caregiver</InputLabel>
            <Select value={caregiverUid} label="Caregiver" onChange={(e) => setCaregiverUid(e.target.value)}>
              {members.map((m) => (
                <MenuItem key={m.uid} value={m.uid}>
                  {m.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DateTimePicker
            label="Start Time"
            value={startTime}
            onChange={setStartTime}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <DateTimePicker
            label="End Time"
            value={endTime}
            onChange={setEndTime}
            minDateTime={startTime ?? undefined}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value={VisitStatus.SCHEDULED}>Scheduled</MenuItem>
              <MenuItem value={VisitStatus.COMPLETED}>Completed</MenuItem>
              <MenuItem value={VisitStatus.CANCELLED}>Cancelled</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!caregiverUid || !startTime || !endTime || saving}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Visit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
