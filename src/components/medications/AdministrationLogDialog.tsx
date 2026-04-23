import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { logAdministration, subscribeAdministrationLog } from '../../services/medicationService';
import { formatDateTime } from '../../utils/dateUtils';
import type { Medication, AdministrationLog } from '../../types';
import MedicationDrugInfo from './MedicationDrugInfo';

interface AdministrationLogDialogProps {
  open: boolean;
  onClose: () => void;
  medication: Medication | null;
}

export default function AdministrationLogDialog({ open, onClose, medication }: AdministrationLogDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [logs, setLogs] = useState<AdministrationLog[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCircle || !medication) return;
    const unsubscribe = subscribeAdministrationLog(
      activeCircle.id,
      medication.id,
      setLogs,
      (err) => console.error('Admin log error:', err)
    );
    return unsubscribe;
  }, [activeCircle?.id, medication?.id]);

  const handleLog = async () => {
    if (!activeCircle || !medication || !userProfile) return;

    setSaving(true);
    try {
      await logAdministration(activeCircle.id, medication.id, userProfile.uid, userProfile.displayName, {
        skipped,
        skipReason: skipped ? skipReason.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      showMessage(skipped ? 'Dose skipped — logged' : 'Dose administered — logged', 'success');
      setSkipped(false);
      setSkipReason('');
      setNotes('');
    } catch {
      showMessage('Failed to log', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!medication) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {medication.name} — {medication.dosage}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {medication.frequency}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <MedicationDrugInfo openFda={medication.openFda} />
        </Box>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Switch checked={skipped} onChange={(e) => setSkipped(e.target.checked)} />}
            label="Dose was skipped"
          />
          {skipped && (
            <TextField
              label="Reason for skipping"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              fullWidth
              size="small"
            />
          )}
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            size="small"
          />
          <Button variant="contained" onClick={handleLog} disabled={saving}>
            {saving ? 'Logging...' : skipped ? 'Log Skipped Dose' : 'Log Dose Given'}
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Recent Log ({logs.length})
        </Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {logs.map((log) => (
            <ListItem key={log.id}>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {log.skipped ? (
                      <Chip icon={<CancelIcon />} label="Skipped" size="small" color="warning" />
                    ) : (
                      <Chip icon={<CheckCircleIcon />} label="Given" size="small" color="success" />
                    )}
                    <Typography variant="body2">{log.administeredByName}</Typography>
                  </Stack>
                }
                secondary={
                  <>
                    {formatDateTime(log.administeredAt)}
                    {log.skipReason && ` — ${log.skipReason}`}
                    {log.notes && ` — ${log.notes}`}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
