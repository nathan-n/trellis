import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Stack } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { getInvitation, acceptInvitation, declineInvitation } from '../../services/circleService';
import { getRoleLabel } from '../../utils/roleUtils';
import type { Invitation } from '../../types';
import { InvitationStatus } from '../../constants';

export default function InvitationAcceptPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { firebaseUser, userProfile, signIn, logOut, refreshProfile } = useAuth();
  const { showMessage } = useSnackbar();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!invitationId) return;
      const inv = await getInvitation(invitationId);
      setInvitation(inv);
      setLoading(false);
    }
    load();
  }, [invitationId]);

  const handleAccept = async () => {
    if (!invitation || !firebaseUser || !userProfile || !invitationId) return;
    setProcessing(true);
    try {
      await acceptInvitation(
        invitationId,
        firebaseUser.uid,
        userProfile.email,
        userProfile.displayName,
        userProfile.photoURL
      );
      await refreshProfile();
      showMessage(`Joined ${invitation.circleName}!`, 'success');
      navigate('/');
    } catch (err) {
      console.error('Accept error:', err);
      showMessage('Failed to accept invitation', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitationId) return;
    setProcessing(true);
    try {
      await declineInvitation(invitationId);
      showMessage('Invitation declined', 'info');
      navigate('/');
    } catch (err) {
      console.error('Decline error:', err);
      showMessage('Failed to decline invitation', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', px: 2 }}>
        <Card sx={{ maxWidth: 420, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" gutterBottom>
              Invitation Not Found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              This invitation may have expired or already been used.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', px: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
          <Typography variant="h4" color="primary" fontWeight={700} gutterBottom>
            Trellis
          </Typography>
          <Typography variant="h6" gutterBottom>
            You're invited to join
          </Typography>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {invitation.circleName}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Invited by {invitation.invitedByName}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Role: {getRoleLabel(invitation.role)}
          </Typography>

          {!firebaseUser ? (
            <Button variant="contained" size="large" fullWidth onClick={signIn}>
              Sign in with Google to Accept
            </Button>
          ) : userProfile && invitation.inviteeEmail !== userProfile.email.toLowerCase() ? (
            <Box>
              <Typography color="error" sx={{ mb: 2 }}>
                This invitation was sent to <strong>{invitation.inviteeEmail}</strong> but you're signed in as <strong>{userProfile.email}</strong>. Please sign in with the correct account.
              </Typography>
              <Button variant="outlined" fullWidth onClick={logOut}>
                Sign Out
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleAccept}
                disabled={processing}
              >
                {processing ? 'Joining...' : 'Accept Invitation'}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleDecline}
                disabled={processing}
              >
                Decline
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
