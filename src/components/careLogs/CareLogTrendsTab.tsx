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

interface Props {
  onJumpToDay?: (dateStr: string) => void;
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : (a / b) * 100;
}

// ─── Aggregators ────────────────────────────────────────────────────────────

function goodDaysRate(logs: CareLog[]): number {
  if (logs.length === 0) return 0;
  const byDate = new Map<string, CareLog[]>();
  for (const l of logs) {
    const arr = byDate.get(l.logDate) ?? [];
    arr.push(l);
    byDate.set(l.logDate, arr);
  }
  let good = 0;
  for (const [, dayLogs] of byDate) {
    // Count a day as "good" if any log has calm/happy mood and no agitated
    const hasGood = dayLogs.some((l) => l.mood === 'calm' || l.mood === 'happy');
    const hasBad = dayLogs.some((l) => l.mood === 'agitated');
    if (hasGood && !hasBad) good += 1;
  }
  return safeDivide(good, byDate.size);
}

function sleepStats(logs: CareLog[]): { avgHours: number; dominantQuality: string | null } {
  // Aggregate per-day first so over-logged days don't bias the average.
  // Per-day sleep: mean of all non-null hoursSlept values on that day.
  const hoursByDay = new Map<string, number[]>();
  const qualityByDay = new Map<string, string[]>();
  for (const l of logs) {
    const h = l.sleep?.hoursSlept;
    if (typeof h === 'number' && h > 0) {
      const arr = hoursByDay.get(l.logDate) ?? [];
      arr.push(h);
      hoursByDay.set(l.logDate, arr);
    }
    if (l.sleep?.quality) {
      const arr = qualityByDay.get(l.logDate) ?? [];
      arr.push(l.sleep.quality);
      qualityByDay.set(l.logDate, arr);
    }
  }
  const dayAverages: number[] = [];
  for (const [, hrs] of hoursByDay) {
    dayAverages.push(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  }
  const avgHours = dayAverages.length ? dayAverages.reduce((a, b) => a + b, 0) / dayAverages.length : 0;

  // Dominant quality per day = first recorded; then tally across days.
  const qualityCount = new Map<string, number>();
  for (const [, qs] of qualityByDay) {
    const q = qs[0];
    if (q) qualityCount.set(q, (qualityCount.get(q) ?? 0) + 1);
  }
  let dominant: string | null = null;
  let max = 0;
  for (const [k, v] of qualityCount) {
    if (v > max) { max = v; dominant = k; }
  }
  return { avgHours, dominantQuality: dominant };
}

function mealCompletion(logs: CareLog[]): number {
  let total = 0;
  let completed = 0;
  for (const l of logs) {
    for (const m of l.meals ?? []) {
      total += 1;
      if (m.amount !== 'refused') completed += 1;
    }
  }
  return safeDivide(completed, total);
}

// Count days where each behavior appeared (not total mentions). A behavior
// logged twice on the same day counts once. Better reflects clinical pattern
// ("wandering happened on 8 days") vs. "wandering was mentioned 12 times."
function topBehavior(logs: CareLog[]): { name: string | null; dayCount: number } {
  const daysByBehavior = new Map<string, Set<string>>();
  for (const l of logs) {
    for (const b of l.behaviors ?? []) {
      const days = daysByBehavior.get(b) ?? new Set<string>();
      days.add(l.logDate);
      daysByBehavior.set(b, days);
    }
  }
  let name: string | null = null;
  let max = 0;
  for (const [k, days] of daysByBehavior) {
    if (days.size > max) { max = days.size; name = k; }
  }
  return { name, dayCount: max };
}

// Day-count for a specific behavior in a given log set — used for delta comparisons.
function behaviorDayCount(logs: CareLog[], behaviorName: string): number {
  const days = new Set<string>();
  for (const l of logs) {
    if (l.behaviors?.includes(behaviorName)) days.add(l.logDate);
  }
  return days.size;
}

// For delta comparisons: same-sized prior window
function percentDelta(current: number, prior: number): number | null {
  if (prior === 0) {
    if (current === 0) return 0;
    return null; // can't compute meaningful delta from zero base
  }
  return ((current - prior) / prior) * 100;
}

// Weekly mood stacked bar data
interface WeeklyMoodDatum {
  weekLabel: string;
  weekStart: string;
  calm: number;
  happy: number;
  confused: number;
  withdrawn: number;
  agitated: number;
  other: number;
}

// Worst-mood-of-day severity scale — matches MoodCalendarHeatmap ordering so the
// bar chart and heatmap tell the same story.
const moodSeverityForWeekly: Record<Mood, number> = {
  agitated: 5,
  confused: 4,
  withdrawn: 3,
  other: 2,
  calm: 1,
  happy: 1,
};

function buildWeeklyMoodData(logs: CareLog[], startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): WeeklyMoodDatum[] {
  // Collapse each day to its dominant (worst) mood first — one data point per day.
  // This avoids over-counting from prolific loggers and matches per-day semantics
  // used elsewhere (Good Days, Heatmap, CircleHealthCard).
  const dayDominant = new Map<string, Mood>();
  for (const l of logs) {
    const prev = dayDominant.get(l.logDate);
    if (!prev || moodSeverityForWeekly[l.mood] > moodSeverityForWeekly[prev]) {
      dayDominant.set(l.logDate, l.mood);
    }
  }

  const anchor = startDate.startOf('week').add(1, 'day'); // dayjs default week starts Sun; use Mon
  const weeks: WeeklyMoodDatum[] = [];
  for (let w = anchor; w.isBefore(endDate) || w.isSame(endDate, 'day'); w = w.add(1, 'week')) {
    const weekEnd = w.add(6, 'day');
    const counts: Record<Mood, number> = { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 };
    for (const [dateStr, mood] of dayDominant) {
      const d = dayjs(dateStr);
      if ((d.isSame(w, 'day') || d.isAfter(w, 'day')) && (d.isSame(weekEnd, 'day') || d.isBefore(weekEnd, 'day'))) {
        counts[mood] += 1;
      }
    }
    weeks.push({
      weekLabel: w.format('MMM D'),
      weekStart: w.format('YYYY-MM-DD'),
      ...counts,
    });
  }
  return weeks;
}

// Daily sleep data (line chart with rolling avg)
interface SleepDatum {
  date: string;
  label: string;
  hours: number | null;
  rolling: number | null;
}

function buildSleepData(logs: CareLog[], startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): SleepDatum[] {
  const byDate = new Map<string, number[]>();
  for (const l of logs) {
    const h = l.sleep?.hoursSlept;
    if (typeof h === 'number' && h > 0) {
      const arr = byDate.get(l.logDate) ?? [];
      arr.push(h);
      byDate.set(l.logDate, arr);
    }
  }
  const out: SleepDatum[] = [];
  for (let d = startDate; d.isBefore(endDate) || d.isSame(endDate, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    const vals = byDate.get(key);
    const hours = vals && vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    out.push({ date: key, label: d.format('MMM D'), hours, rolling: null });
  }
  // 7-day rolling average
  for (let i = 0; i < out.length; i++) {
    const window = out.slice(Math.max(0, i - 6), i + 1).map((x) => x.hours).filter((h): h is number => h != null);
    out[i].rolling = window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;
  }
  return out;
}

// Time-of-day mood (morning 5-12, afternoon 12-17, evening 17-21, night 21-5)
interface ToDDatum {
  bucket: string;
  calm: number;
  happy: number;
  confused: number;
  withdrawn: number;
  agitated: number;
  other: number;
}

function todBucket(hour: number): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

function buildTimeOfDayMood(logs: CareLog[]): ToDDatum[] {
  const buckets: Record<string, Record<Mood, number>> = {
    Morning: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Afternoon: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Evening: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Night: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
  };
  for (const l of logs) {
    const d = l.logTimestamp?.toDate?.();
    if (!d) continue;
    const b = todBucket(d.getHours());
    buckets[b][l.mood] += 1;
  }
  return (['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((b) => ({
    bucket: b,
    ...buckets[b],
  }));
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
                One bar segment per day — days with multiple entries use the day's worst mood.
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyMood}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
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
