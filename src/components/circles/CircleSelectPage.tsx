import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Grid,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { getCircle, getPendingInvitations, acceptInvitation } from '../../services/circleService';
import type { Circle, Invitation } from '../../types';
import CircleCreateDialog from './CircleCreateDialog';

export default function CircleSelectPage() {
  const { userProfile, firebaseUser, refreshProfile } = useAuth();
  const { switchCircle } = useCircle();
  const navigate = useNavigate();
  const { showMessage } = useSnackbar();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userProfile) return;

      const circlePromises = userProfile.circleIds.map((id) => getCircle(id));
      const results = await Promise.all(circlePromises);
      setCircles(results.filter(Boolean) as Circle[]);

      const pending = await getPendingInvitations(userProfile.email);
      setInvitations(pending);

      setLoading(false);
    }
    load();
  }, [userProfile]);

  const handleSelectCircle = async (circleId: string) => {
    await switchCircle(circleId);
    navigate('/');
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await acceptInvitation(
        invitation.id,
        firebaseUser.uid,
        userProfile.email,
        userProfile.displayName,
        userProfile.photoURL
      );
      await refreshProfile();
      showMessage(`Joined ${invitation.circleName}!`, 'success');
    } catch {
      showMessage('Failed to accept invitation', 'error');
    }
  };

  const handleCreated = async (circleId: string) => {
    await refreshProfile();
    await switchCircle(circleId);
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Your Care Circles
      </Typography>

      {invitations.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Pending Invitations
          </Typography>
          <Stack spacing={2}>
            {invitations.map((inv) => (
              <Card key={inv.id} variant="outlined">
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>{inv.circleName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Invited by {inv.invitedByName}
                    </Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={() => handleAcceptInvitation(inv)}>
                    Accept
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      <Grid container spacing={2}>
        {circles.map((circle) => (
          <Grid size={{ xs: 12, sm: 6 }} key={circle.id}>
            <Card>
              <CardActionArea onClick={() => handleSelectCircle(circle.id)} sx={{ p: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <GroupIcon color="primary" />
                    <Typography variant="h6">{circle.name}</Typography>
                  </Box>
                  <Typography color="text.secondary">
                    Caring for {circle.patientName}
                  </Typography>
                  <Chip
                    label={`${circle.memberCount} member${circle.memberCount !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderStyle: 'dashed',
            }}
          >
            <CardActionArea onClick={() => setCreateOpen(true)} sx={{ p: 2, textAlign: 'center' }}>
              <CardContent>
                <AddIcon color="primary" sx={{ fontSize: 40 }} />
                <Typography color="primary" fontWeight={600}>
                  Create New Circle
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      <CircleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
}
