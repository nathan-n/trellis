import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createCircle } from '../../services/circleService';

interface CircleCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (circleId: string) => void;
}

export default function CircleCreateDialog({ open, onClose, onCreated }: CircleCreateDialogProps) {
  const { userProfile, firebaseUser } = useAuth();
  const { showMessage } = useSnackbar();
  const [name, setName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState<Dayjs | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !patientName.trim() || !firebaseUser || !userProfile) return;

    setSaving(true);
    try {
      const circleId = await createCircle(
        firebaseUser.uid,
        userProfile.email,
        userProfile.displayName,
        userProfile.photoURL,
        {
          name: name.trim(),
          patientName: patientName.trim(),
          patientDob: patientDob ? patientDob.toDate() : null,
        }
      );
      showMessage('Care circle created', 'success');
      onCreated(circleId);
      handleClose();
    } catch (err) {
      console.error('Create circle error:', err);
      showMessage('Failed to create circle', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPatientName('');
    setPatientDob(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create a Care Circle</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Circle Name"
            placeholder="e.g. Care Circle for Mom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Patient Name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            fullWidth
            required
          />
          <DatePicker
            label="Patient Date of Birth"
            value={patientDob}
            onChange={setPatientDob}
            maxDate={dayjs()}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim() || !patientName.trim() || saving}
        >
          {saving ? 'Creating...' : 'Create Circle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
