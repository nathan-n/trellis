import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { CircleRole } from '../../constants';
import { getRoleLabel } from '../../utils/roleUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createInvitation } from '../../services/circleService';

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteDialog({ open, onClose }: InviteDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CircleRole>(CircleRole.FAMILY);
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      const invitationId = await createInvitation(
        activeCircle.id,
        activeCircle.name,
        email.trim(),
        userProfile.uid,
        userProfile.displayName,
        role
      );
      showMessage(`Invitation sent to ${email}`, 'success');
      // TODO: In the future, send an email with the invitation link
      console.log(`Invitation link: ${window.location.origin}/invite/${invitationId}`);
      handleClose();
    } catch (err) {
      console.error('Invite error:', err);
      showMessage('Failed to send invitation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole(CircleRole.FAMILY);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite a Caregiver</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Send an invitation to join {activeCircle?.name}. They'll need to sign in with this email
          address.
        </Typography>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value as CircleRole)}>
              {Object.values(CircleRole).map((r) => (
                <MenuItem key={r} value={r}>
                  {getRoleLabel(r)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleInvite} variant="contained" disabled={!email.trim() || saving}>
          {saving ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
