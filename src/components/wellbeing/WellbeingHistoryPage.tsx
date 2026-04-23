import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Link, Button,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeMyCheckins } from '../../services/wellbeingService';
import type { WellbeingCheckin } from '../../types/wellbeing';
import WellbeingCheckinCard from './WellbeingCheckinCard';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import PageHeader from '../shared/PageHeader';
import { accentChipSx, type AccentKind } from '../../utils/accentMap';

const stressLabels = ['', 'Low', 'Mild', 'Moderate', 'High', 'Very High'];
// Stress severity uses the Direction C accent map (review finding 03):
//   1–2 low  → green (OK)
//   3 moderate → ochre (scheduled/attention)
//   4–5 high → clay (urgent)
// Replaces the prior MUI success/info/warning/error palette so the chip
// speaks the same visual language as priority chips across the app.
const stressAccent: Record<number, AccentKind> = {
  1: 'green', 2: 'green', 3: 'ochre', 4: 'clay', 5: 'clay',
};

export default function WellbeingHistoryPage() {
  const navigate = useNavigate();
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

  // Dynamic overline: streak + most recent check-in recency.
  // IMPORTANT: computed before the `if (loading)` early-return so the
  // hook call order stays stable across renders (Rules of Hooks).
  const headerOverline = useMemo(() => {
    if (checkins.length === 0) return 'No check-ins yet';
    const latestAt = checkins[0]?.createdAt?.toDate?.();
    // Streak = consecutive days (counting back from today) with any check-in.
    const dateKeys = new Set(
      checkins
        .map((c) => c.createdAt?.toDate?.())
        .filter((d): d is Date => Boolean(d))
        .map((d) => dayjs(d).format('YYYY-MM-DD'))
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const key = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      if (dateKeys.has(key)) streak += 1;
      else break;
    }
    if (!latestAt) return `${checkins.length} check-in${checkins.length === 1 ? '' : 's'}`;
    // eslint-disable-next-line react-hooks/purity -- recency is snapshot-at-mount
    const diffDays = Math.floor((Date.now() - latestAt.getTime()) / (1000 * 60 * 60 * 24));
    const recency = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays}d ago`;
    if (streak >= 2) return `${streak}-day streak · last ${recency}`;
    return `${checkins.length} check-in${checkins.length === 1 ? '' : 's'} · last ${recency}`;
  }, [checkins]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader overline={headerOverline} title="Your wellbeing" />

      {/* Inline check-in form */}
      <WellbeingCheckinCard />

      {/* Crisis Support & Resources Link */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Crisis Support</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            24/7 Alzheimer's Association Helpline: <Link href="tel:1-800-272-3900" fontWeight={600}>1-800-272-3900</Link>
          </Typography>
          <Button
            startIcon={<MenuBookIcon />}
            variant="outlined"
            size="small"
            onClick={() => navigate('/resources')}
          >
            View all caregiver resources
          </Button>
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
                      sx={accentChipSx(stressAccent[c.stressLevel] ?? 'slate')}
                    />
                    <Chip label={`Sleep: ${c.sleepQuality}`} size="small" variant="outlined" />
                    {c.feelingOverwhelmed && (
                      // Overwhelmed is wellbeing-domain, so rose (body &
                      // care tone) — not MUI error red — keeps the chip
                      // in-family with the rest of the wellbeing page.
                      <Chip
                        label="Overwhelmed"
                        size="small"
                        variant="outlined"
                        sx={{ color: 'rose.dark', borderColor: 'rose.main' }}
                      />
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
