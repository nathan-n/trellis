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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import dayjs, { type Dayjs } from 'dayjs';
import { VisitStatus } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useCircleMembers } from '../../hooks/useCircleMembers';
import { createVisit, updateVisit } from '../../services/visitService';
import type { Visit } from '../../types';

function normalizeStatus(status: string): string {
  if (status === 'scheduled' || status === 'completed') return 'confirmed';
  if (status === 'cancelled') return 'confirmed';
  return status;
}

interface VisitCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  visit?: Visit | null;
  defaultDate?: Date | null;
  defaultEndDate?: Date | null;
  viewMode?: 'monthly' | 'coverage';
}

export default function VisitCreateEditDialog({ open, onClose, visit, defaultDate, defaultEndDate, viewMode = 'coverage' }: VisitCreateEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const { members } = useCircleMembers();
  const [saving, setSaving] = useState(false);

  const [caregiverUid, setCaregiverUid] = useState('');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>(VisitStatus.CONFIRMED);

  const isEdit = Boolean(visit);
  const isMonthly = viewMode === 'monthly';

  useEffect(() => {
    if (visit) {
      setCaregiverUid(visit.caregiverUid);
      setStartTime(dayjs(visit.startTime.toDate()));
      setEndTime(dayjs(visit.endTime.toDate()));
      setNotes(visit.notes ?? '');
      setStatus(normalizeStatus(visit.status));
    } else {
      setCaregiverUid(userProfile?.uid ?? '');
      if (defaultDate) {
        const start = dayjs(defaultDate);
        if (isMonthly) {
          setStartTime(start.startOf('day'));
          if (defaultEndDate) {
            // Drag selection: end is already the day after last selected day from react-big-calendar
            setEndTime(dayjs(defaultEndDate).startOf('day'));
          } else {
            setEndTime(start.add(1, 'day').startOf('day'));
          }
        } else {
          setStartTime(start.hour(9).minute(0));
          setEndTime(start.hour(17).minute(0));
        }
      } else {
        setStartTime(null);
        setEndTime(null);
      }
      setNotes('');
      setStatus(VisitStatus.CONFIRMED);
    }
  }, [visit, open, userProfile, defaultDate, defaultEndDate, isMonthly]);

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
        isAllDay: isMonthly || (visit?.isAllDay ?? false),
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

          {isMonthly ? (
            <>
              <DatePicker
                label="Start Date"
                value={startTime}
                onChange={(v) => v && setStartTime(v.startOf('day'))}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={endTime ? endTime.subtract(1, 'day') : null}
                onChange={(v) => v && setEndTime(v.add(1, 'day').startOf('day'))}
                minDate={startTime ?? undefined}
                slotProps={{ textField: { fullWidth: true, helperText: 'Last day of the visit' } }}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <ToggleButtonGroup
            value={status}
            exclusive
            onChange={(_, val) => val && setStatus(val)}
            fullWidth
            size="small"
          >
            <ToggleButton value={VisitStatus.CONFIRMED}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> Confirmed
            </ToggleButton>
            <ToggleButton value={VisitStatus.TENTATIVE}>
              <HelpOutlineIcon fontSize="small" sx={{ mr: 0.5 }} /> Tentative
            </ToggleButton>
          </ToggleButtonGroup>

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
