import { useMemo } from 'react';
import { Box, GlobalStyles, Typography, Stack, Tooltip } from '@mui/material';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import dayjs from 'dayjs';
import { Mood } from '../../constants';
import type { CareLog } from '../../types';

// Mood → palette. Tuned to warm, calm colors matching the app theme.
const moodColors: Record<Mood, string> = {
  calm: '#6DB97B',       // primary.light (green)
  happy: '#3A7D44',      // primary.main (green)
  confused: '#F9A825',   // warning
  withdrawn: '#7C6F9B',  // secondary
  agitated: '#C62828',   // error
  other: '#9E9E9E',      // grey
};

const emptyColor = '#EBEDEF';

const moodLabels: Record<Mood, string> = {
  calm: 'Calm',
  happy: 'Happy',
  agitated: 'Agitated',
  confused: 'Confused',
  withdrawn: 'Withdrawn',
  other: 'Other',
};

// Scoring: if multiple logs on one day, pick the "worst" dominant mood.
// Higher score = worse (agitated > confused > withdrawn > other > calm/happy).
const moodSeverity: Record<Mood, number> = {
  agitated: 5,
  confused: 4,
  withdrawn: 3,
  other: 2,
  calm: 1,
  happy: 1,
};

interface DayValue {
  date: string;
  mood: Mood | null;
  count: number;
}

interface Props {
  logs: CareLog[];
  startDate: Date;
  endDate: Date;
  onDayClick?: (dateStr: string) => void;
}

export default function MoodCalendarHeatmap({ logs, startDate, endDate, onDayClick }: Props) {
  // Build values array: one entry per day in range; aggregate logs by date.
  const values = useMemo<DayValue[]>(() => {
    const byDate = new Map<string, CareLog[]>();
    for (const log of logs) {
      const arr = byDate.get(log.logDate) ?? [];
      arr.push(log);
      byDate.set(log.logDate, arr);
    }
    const out: DayValue[] = [];
    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');
    for (let d = start; d.isBefore(end) || d.isSame(end); d = d.add(1, 'day')) {
      const key = d.format('YYYY-MM-DD');
      const dayLogs = byDate.get(key);
      if (!dayLogs || dayLogs.length === 0) {
        out.push({ date: key, mood: null, count: 0 });
      } else {
        // Pick the "worst" mood of the day to surface concern
        const worst = dayLogs.reduce((acc, cur) => (moodSeverity[cur.mood] > moodSeverity[acc.mood] ? cur : acc));
        out.push({ date: key, mood: worst.mood, count: dayLogs.length });
      }
    }
    return out;
  }, [logs, startDate, endDate]);

  return (
    <Box>
      {/* Inject CSS for each mood class once. Overrides default react-calendar-heatmap styling. */}
      <GlobalStyles
        styles={{
          '.react-calendar-heatmap .color-empty': { fill: emptyColor },
          '.react-calendar-heatmap .color-mood-calm': { fill: moodColors.calm },
          '.react-calendar-heatmap .color-mood-happy': { fill: moodColors.happy },
          '.react-calendar-heatmap .color-mood-confused': { fill: moodColors.confused },
          '.react-calendar-heatmap .color-mood-withdrawn': { fill: moodColors.withdrawn },
          '.react-calendar-heatmap .color-mood-agitated': { fill: moodColors.agitated },
          '.react-calendar-heatmap .color-mood-other': { fill: moodColors.other },
          '.react-calendar-heatmap rect': {
            rx: 2,
            cursor: 'pointer',
          },
          '.react-calendar-heatmap text': {
            fontSize: '9px',
            fill: '#888',
          },
        }}
      />
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        gutterSize={2}
        showWeekdayLabels
        classForValue={(v) => {
          const dv = v as DayValue | null;
          if (!dv || !dv.mood) return 'color-empty';
          return `color-mood-${dv.mood}`;
        }}
        titleForValue={(v) => {
          const dv = v as DayValue | null;
          if (!dv) return '';
          const dateStr = dayjs(dv.date).format('MMM D, YYYY');
          if (!dv.mood) return `${dateStr} — no entry`;
          return `${dateStr} — ${moodLabels[dv.mood]} (${dv.count} entr${dv.count === 1 ? 'y' : 'ies'})`;
        }}
        onClick={(v) => {
          const dv = v as DayValue | null;
          if (dv && onDayClick) onDayClick(dv.date);
        }}
      />

      {/* Legend */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.75 }}>
        {(Object.keys(moodLabels) as Mood[]).map((m) => (
          <Tooltip key={m} title={moodLabels[m]} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: moodColors[m], borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">{moodLabels[m]}</Typography>
            </Box>
          </Tooltip>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: emptyColor, borderRadius: 0.5 }} />
          <Typography variant="caption" color="text.secondary">No entry</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export { moodColors, moodLabels };
