import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Link,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeMyCheckins } from '../../services/wellbeingService';
import type { WellbeingCheckin } from '../../types/wellbeing';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

const stressLabels = ['', 'Low', 'Mild', 'Moderate', 'High', 'Very High'];
const stressColors: Record<number, 'success' | 'info' | 'warning' | 'error'> = {
  1: 'success', 2: 'success', 3: 'warning', 4: 'error', 5: 'error',
};

export default function WellbeingHistoryPage() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const [checkins, setCheckins] = useState<WellbeingCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle || !userProfile) return;
    const unsubscribe = subscribeMyCheckins(
      activeCircle.id,
      userProfile.uid,
      (data) => { setCheckins(data); setLoading(false); },
      (err) => { console.error('Wellbeing error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id, userProfile?.uid]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <FavoriteIcon color="secondary" />
        <Typography variant="h5">Your Wellbeing</Typography>
      </Box>

      {/* Resources */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Caregiver Resources</Typography>
          <Stack spacing={1}>
            <Link href="https://www.alz.org/help-support/caregiving" target="_blank" rel="noopener noreferrer">
              Alzheimer's Association — Caregiver Support
            </Link>
            <Link href="https://www.caregiver.org/" target="_blank" rel="noopener noreferrer">
              Family Caregiver Alliance
            </Link>
            <Link href="https://www.alz.org/help-support/community_resource_finder" target="_blank" rel="noopener noreferrer">
              Community Resource Finder — Find Local Help
            </Link>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              24/7 Helpline: <Link href="tel:1-800-272-3900">1-800-272-3900</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Check-in History */}
      <Typography variant="h6" gutterBottom>Your Check-In History</Typography>
      {checkins.length === 0 ? (
        <EmptyState
          icon={<FavoriteIcon />}
          title="No check-ins yet"
          description="Your weekly wellbeing check-ins will appear here. Look for the prompt on your priority page."
        />
      ) : (
        <Stack spacing={1.5}>
          {checkins.map((c) => (
            <Card key={c.id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">{c.date}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Chip
                      label={`Stress: ${stressLabels[c.stressLevel]}`}
                      size="small"
                      color={stressColors[c.stressLevel] ?? 'default'}
                    />
                    <Chip label={`Sleep: ${c.sleepQuality}`} size="small" variant="outlined" />
                    {c.feelingOverwhelmed && (
                      <Chip label="Overwhelmed" size="small" color="error" variant="outlined" />
                    )}
                  </Stack>
                </Box>
                {c.notes && (
                  <Typography variant="body2" color="text.secondary">{c.notes}</Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
