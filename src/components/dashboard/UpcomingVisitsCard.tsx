import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Stack, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EventIcon from '@mui/icons-material/EventOutlined';
import dayjs from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeVisitsByDateRange } from '../../services/visitService';
import type { Visit } from '../../types';

export default function UpcomingVisitsCard() {
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle) return;
    const today = dayjs().format('YYYY-MM-DD');
    const inSeven = dayjs().add(7, 'day').format('YYYY-MM-DD');
    const unsubscribe = subscribeVisitsByDateRange(
      activeCircle.id,
      today,
      inSeven,
      (data) => { setVisits(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const nextVisit = visits[0];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <EventIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Upcoming Visits
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : !nextVisit ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">No visits scheduled this week.</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/visits')}>
              Schedule
            </Button>
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.2 }}>
              {nextVisit.caregiverName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayjs(nextVisit.startTime.toDate()).format('ddd MMM D, h:mm A')}
            </Typography>
            {visits.length > 1 && (
              <Typography variant="caption" color="text.secondary">
                +{visits.length - 1} more this week
              </Typography>
            )}
            <Button size="small" onClick={() => navigate('/visits')} sx={{ alignSelf: 'flex-start', px: 0, mt: 0.5 }}>
              View calendar →
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
