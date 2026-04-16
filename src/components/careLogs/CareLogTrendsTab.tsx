import { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Chip, Stack } from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { fetchCareLogsInRange } from '../../services/careLogService';
import type { CareLog } from '../../types';
import { Mood } from '../../constants';
import TrendWindowToggle, { type TrendWindow, WINDOW_DAYS } from '../analytics/TrendWindowToggle';
import MetricCard from '../analytics/MetricCard';
import MoodCalendarHeatmap, { moodColors, moodLabels } from '../analytics/MoodCalendarHeatmap';
import {
  goodDaysRate,
  sleepStats,
  mealCompletion,
  topBehavior,
  behaviorDayCount,
  percentDelta,
  buildWeeklyMoodData,
  buildSleepData,
  buildTimeOfDayMood,
} from '../../utils/careLogAggregates';

interface Props {
  onJumpToDay?: (dateStr: string) => void;
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CareLogTrendsTab({ onJumpToDay }: Props) {
  const { activeCircle } = useCircle();
  const [window, setWindow] = useState<TrendWindow>('30d');
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [priorLogs, setPriorLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);

  const endDate = useMemo(() => dayjs().endOf('day'), []);
  const startDate = useMemo(() => endDate.subtract(WINDOW_DAYS[window] - 1, 'day').startOf('day'), [endDate, window]);
  const priorEnd = useMemo(() => startDate.subtract(1, 'day').endOf('day'), [startDate]);
  const priorStart = useMemo(() => priorEnd.subtract(WINDOW_DAYS[window] - 1, 'day').startOf('day'), [priorEnd, window]);

  useEffect(() => {
    if (!activeCircle) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [current, prior] = await Promise.all([
          fetchCareLogsInRange(activeCircle.id, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
          fetchCareLogsInRange(activeCircle.id, priorStart.format('YYYY-MM-DD'), priorEnd.format('YYYY-MM-DD')),
        ]);
        if (cancelled) return;
        setLogs(current);
        setPriorLogs(prior);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCircle?.id, startDate, endDate, priorStart, priorEnd]);

  // Metrics
  const metrics = useMemo(() => {
    const curGood = goodDaysRate(logs);
    const priorGood = goodDaysRate(priorLogs);
    const curSleep = sleepStats(logs);
    const priorSleep = sleepStats(priorLogs);
    const curMeals = mealCompletion(logs);
    const priorMeals = mealCompletion(priorLogs);
    const curBehavior = topBehavior(logs);
    const priorBehaviorDays = curBehavior.name ? behaviorDayCount(priorLogs, curBehavior.name) : 0;
    return {
      goodDays: { value: curGood, delta: percentDelta(curGood, priorGood) },
      sleep: {
        avg: curSleep.avgHours,
        quality: curSleep.dominantQuality,
        delta: percentDelta(curSleep.avgHours, priorSleep.avgHours),
      },
      meals: { value: curMeals, delta: percentDelta(curMeals, priorMeals) },
      behavior: {
        name: curBehavior.name,
        dayCount: curBehavior.dayCount,
        delta: percentDelta(curBehavior.dayCount, priorBehaviorDays),
      },
    };
  }, [logs, priorLogs]);

  const weeklyMood = useMemo(() => buildWeeklyMoodData(logs, startDate, endDate), [logs, startDate, endDate]);
  const sleepData = useMemo(() => buildSleepData(logs, startDate, endDate), [logs, startDate, endDate]);
  const todData = useMemo(() => buildTimeOfDayMood(logs), [logs]);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TrendWindowToggle value={window} onChange={setWindow} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No care log entries in this window. Try widening the time range or add some entries.
        </Typography>
      ) : (
        <>
          {/* Metric cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label="Good Days"
                value={pct(metrics.goodDays.value)}
                sublabel="Calm or happy, no agitation"
                deltaPct={metrics.goodDays.delta}
                accentColor={moodColors.calm}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label="Sleep (avg)"
                value={metrics.sleep.avg ? `${metrics.sleep.avg.toFixed(1)}h` : '—'}
                sublabel={metrics.sleep.quality ? `Mostly ${metrics.sleep.quality}` : 'No sleep data'}
                deltaPct={metrics.sleep.delta}
                accentColor="#1565C0"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label="Meals Eaten"
                value={pct(metrics.meals.value)}
                sublabel="Non-refused portions"
                deltaPct={metrics.meals.delta}
                accentColor="#E65100"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label="Top Behavior"
                value={metrics.behavior.name ?? '—'}
                sublabel={metrics.behavior.dayCount > 0
                  ? `On ${metrics.behavior.dayCount} day${metrics.behavior.dayCount === 1 ? '' : 's'}`
                  : 'None logged'}
                deltaPct={metrics.behavior.delta}
                inverted
                accentColor={moodColors.agitated}
              />
            </Grid>
          </Grid>

          {/* Mood distribution stacked bar */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>Mood distribution by week</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontStyle: 'italic' }}>
                Grouped into week-long buckets (Monday–Sunday). One bar segment per day — days with multiple entries use the day's worst mood.
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyMood}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => `Wk of ${v}`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip labelFormatter={(label) => `Week of ${label}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {(Object.keys(moodLabels) as Mood[]).map((m) => (
                    <Bar key={m} dataKey={m} stackId="mood" fill={moodColors[m]} name={moodLabels[m]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mood calendar heatmap */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>Mood calendar</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Each square is a day. Click a day to jump to its entries.
              </Typography>
              <MoodCalendarHeatmap
                logs={logs}
                startDate={startDate.toDate()}
                endDate={endDate.toDate()}
                onDayClick={onJumpToDay}
              />
            </CardContent>
          </Card>

          {/* Sleep trend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Sleep hours</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 14]} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="hours" stroke="#1565C0" strokeWidth={1} dot={{ r: 2 }} name="Hours" connectNulls={false} />
                  <Line type="monotone" dataKey="rolling" stroke="#7C6F9B" strokeWidth={2.5} dot={false} name="7-day avg" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time of day mood */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>Mood by time of day</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Elevated evening agitation can be a sundowning signal — worth mentioning at the next doctor visit.
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={todData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {(Object.keys(moodLabels) as Mood[]).map((m) => (
                    <Bar key={m} dataKey={m} stackId="mood" fill={moodColors[m]} name={moodLabels[m]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary footnote */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label={`${logs.length} entries in this window`} variant="outlined" />
            <Chip
              size="small"
              label={`${new Set(logs.map((l) => l.logDate)).size} days with entries`}
              variant="outlined"
            />
          </Stack>
        </>
      )}
    </Box>
  );
}
