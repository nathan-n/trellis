import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Stack, Chip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import dayjs from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { fetchCareLogsInRange } from '../../services/careLogService';
import type { CareLog } from '../../types';
import Sparkline from '../shared/Sparkline';
import { moodLabels } from '../analytics/MoodCalendarHeatmap';
import type { Mood } from '../../constants';

// Map moods to a 1-5 wellness scale for the Sparkline (its default y range).
// Higher = better day. Picks the worst mood of the day for the daily score.
const moodWellness: Record<Mood, number> = {
  happy: 5,
  calm: 4,
  other: 3,
  withdrawn: 3,
  confused: 2,
  agitated: 1,
};

export default function CircleHealthCard() {
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle) return;
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    let cancelled = false;
    fetchCareLogsInRange(activeCircle.id, start, end)
      .then((data) => { if (!cancelled) { setLogs(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCircle?.id]);

  // Group by day, compute worst-mood wellness per day + avg sleep
  const { wellnessSeries, avgSleep, dominantMood, logCount } = (() => {
    const byDay = new Map<string, CareLog[]>();
    for (const l of logs) {
      const arr = byDay.get(l.logDate) ?? [];
      arr.push(l);
      byDay.set(l.logDate, arr);
    }
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const dayLogs = byDay.get(key) ?? [];
      if (dayLogs.length === 0) {
        days.push(NaN);
      } else {
        const minWellness = Math.min(...dayLogs.map((l) => moodWellness[l.mood as Mood] ?? 3));
        days.push(minWellness);
      }
    }
    // Aggregate sleep hours per-day first, then average across days.
    // Avoids bias from days with multiple entries where each reports sleep.
    const hoursByDay = new Map<string, number[]>();
    for (const l of logs) {
      const h = l.sleep?.hoursSlept;
      if (typeof h === 'number' && h > 0) {
        const arr = hoursByDay.get(l.logDate) ?? [];
        arr.push(h);
        hoursByDay.set(l.logDate, arr);
      }
    }
    const perDayAverages: number[] = [];
    for (const [, hrs] of hoursByDay) {
      perDayAverages.push(hrs.reduce((a, b) => a + b, 0) / hrs.length);
    }
    const avg = perDayAverages.length
      ? perDayAverages.reduce((a, b) => a + b, 0) / perDayAverages.length
      : 0;
    const moodCount = new Map<Mood, number>();
    for (const l of logs) {
      moodCount.set(l.mood as Mood, (moodCount.get(l.mood as Mood) ?? 0) + 1);
    }
    let dom: Mood | null = null; let max = 0;
    for (const [k, v] of moodCount) {
      if (v > max) { dom = k; max = v; }
    }
    return { wellnessSeries: days, avgSleep: avg, dominantMood: dom, logCount: logs.length };
  })();

  return (
    <Card
      sx={{ height: '100%', cursor: 'pointer' }}
      onClick={() => navigate('/care-log')}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FavoriteBorderIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Circle Health (7d)
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : logCount === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No care logs in the last 7 days.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                Mood trajectory
              </Typography>
              <Sparkline
                values={wellnessSeries.map((v) => (Number.isFinite(v) ? v : 3))}
                markers={wellnessSeries.map(() => false)}
                width={200}
                height={52}
                showYAxis={false}
                lineColor="#3A7D44"
              />
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {dominantMood && (
                <Chip
                  size="small"
                  label={`Mostly ${moodLabels[dominantMood].toLowerCase()}`}
                  variant="outlined"
                />
              )}
              {avgSleep > 0 && (
                <Chip size="small" label={`Sleep avg ${avgSleep.toFixed(1)}h`} variant="outlined" />
              )}
              <Chip size="small" label={`${logCount} entries`} variant="outlined" />
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
