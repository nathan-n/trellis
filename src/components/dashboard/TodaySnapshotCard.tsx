import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import MoodIcon from '@mui/icons-material/MoodOutlined';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeCareLogsByDate } from '../../services/careLogService';
import type { CareLog } from '../../types';
import { formatDateTime } from '../../utils/dateUtils';
import { moodColors, moodLabels } from '../analytics/MoodCalendarHeatmap';
import type { Mood } from '../../constants';

export default function TodaySnapshotCard() {
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const today = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeCareLogsByDate(
      activeCircle.id,
      today,
      (data) => { setLogs(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [activeCircle?.id, today]);

  const mostRecent = logs[0];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <MoodIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Today
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : !mostRecent ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              No care log entries yet today.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/care-log')}>
              Log an entry
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={moodLabels[mostRecent.mood as Mood] ?? mostRecent.mood}
                size="small"
                sx={{
                  bgcolor: moodColors[mostRecent.mood as Mood] ?? '#9E9E9E',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                by {mostRecent.authorName}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(mostRecent.logTimestamp)}
            </Typography>
            {logs.length > 1 && (
              <Typography variant="caption" color="text.secondary">
                {logs.length} entries today
              </Typography>
            )}
            <Button size="small" onClick={() => navigate('/care-log')} sx={{ alignSelf: 'flex-start', px: 0 }}>
              See all →
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
