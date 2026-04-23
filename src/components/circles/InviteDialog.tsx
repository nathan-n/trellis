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
  Box,
  Alert,
  IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
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
      const link = `${window.location.origin}/invite/${invitationId}`;
      setInviteLink(link);
      showMessage('Invitation created — share the link below', 'success');
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
    setInviteLink(null);
    onClose();
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showMessage('Link copied to clipboard', 'success');
      });
    }
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

        {inviteLink && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Share this link with {email}:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all', fontSize: '0.8rem' }}>
                {inviteLink}
              </Typography>
              <IconButton size="small" onClick={handleCopyLink} title="Copy link">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {inviteLink ? (
          <Button onClick={handleClose} variant="contained">Done</Button>
        ) : (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleInvite} variant="contained" disabled={!email.trim() || saving}>
              {saving ? 'Sending...' : 'Send Invitation'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
