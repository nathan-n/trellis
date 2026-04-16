import { useMemo, useState } from 'react';
import {
  Box,
  GlobalStyles,
  Typography,
  Stack,
  Tooltip,
  Popper,
  Paper,
  Fade,
  Divider,
} from '@mui/material';
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

const emptyColor = '#EDEFF1';

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
  logs: CareLog[];
}

interface Props {
  logs: CareLog[];
  startDate: Date;
  endDate: Date;
  onDayClick?: (dateStr: string) => void;
}

// ─── Tooltip content ───────────────────────────────────────────────────────

function topN<T>(items: T[], n: number): T[] {
  const counts = new Map<T, number>();
  for (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function DayTooltipContent({ value }: { value: DayValue }) {
  const d = dayjs(value.date);
  const weekday = d.format('dddd, MMM D, YYYY');
  const relative = (() => {
    const today = dayjs().startOf('day');
    const diff = today.diff(d.startOf('day'), 'day');
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff > 1 && diff < 7) return `${diff} days ago`;
    return null;
  })();

  // Build chronological mood timeline for multi-entry days.
  // Shows the sequence ("8:30am Calm → 4:15pm Agitated → 8:00pm Calm") —
  // more useful for pattern-spotting than just knowing there were multiple moods.
  const timeline = value.logs.length > 1
    ? value.logs
        .slice()
        .sort((a, b) => (a.logTimestamp?.toMillis?.() ?? 0) - (b.logTimestamp?.toMillis?.() ?? 0))
        .map((l) => ({
          mood: l.mood,
          time: l.logTimestamp?.toDate ? dayjs(l.logTimestamp.toDate()).format('h:mma') : '',
        }))
    : null;

  if (!value.mood || value.logs.length === 0) {
    return (
      <Box sx={{ p: 1.25, minWidth: 180 }}>
        <Typography variant="body2" fontWeight={700}>{weekday}</Typography>
        {relative && (
          <Typography variant="caption" sx={{ opacity: 0.7 }}>{relative}</Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          No care log entry this day.
        </Typography>
      </Box>
    );
  }

  // Derive rich context from logs
  const authors = Array.from(new Set(value.logs.map((l) => l.authorName).filter(Boolean))) as string[];
  const allBehaviors = value.logs.flatMap((l) => l.behaviors ?? []);
  const topBehaviors = topN(allBehaviors, 3);
  const allActivities = value.logs.flatMap((l) => l.activities ?? []);
  const topActivities = topN(allActivities, 3);

  const sleepHours = value.logs.map((l) => l.sleep?.hoursSlept).filter((h): h is number => typeof h === 'number' && h > 0);
  const avgSleep = sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null;
  const sleepQuality = value.logs.map((l) => l.sleep?.quality).find(Boolean);

  const totalMeals = value.logs.reduce((acc, l) => acc + (l.meals?.length ?? 0), 0);
  const refusedMeals = value.logs.reduce(
    (acc, l) => acc + (l.meals?.filter((m) => m.amount === 'refused').length ?? 0),
    0
  );

  const handoff = value.logs.find((l) => l.isShiftHandoff);
  const firstNote = value.logs.map((l) => l.generalNotes).find((n): n is string => Boolean(n && n.trim()));

  return (
    <Box sx={{ p: 1.25, minWidth: 200, maxWidth: 280 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="body2" fontWeight={700}>{weekday}</Typography>
        {relative && (
          <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{relative}</Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
        <Box sx={{ width: 10, height: 10, bgcolor: moodColors[value.mood], borderRadius: 0.5 }} />
        <Typography variant="body2" fontWeight={600}>{moodLabels[value.mood]}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          — {value.count} entr{value.count === 1 ? 'y' : 'ies'}
        </Typography>
      </Box>

      {authors.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
          Logged by {authors.join(', ')}
        </Typography>
      )}

      {timeline && (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.25 }}>
            Mood timeline
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
            {timeline.map((t, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 7, height: 7, bgcolor: moodColors[t.mood], borderRadius: '50%' }} />
                <Typography variant="caption" sx={{ fontSize: 10.5 }}>
                  {t.time} {moodLabels[t.mood]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {(topBehaviors.length > 0 || topActivities.length > 0 || avgSleep != null || totalMeals > 0) && (
        <Divider sx={{ my: 0.75, opacity: 0.3 }} />
      )}

      {topBehaviors.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Behaviors:</strong> {topBehaviors.join(', ')}
        </Typography>
      )}
      {topActivities.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Activities:</strong> {topActivities.join(', ')}
        </Typography>
      )}
      {avgSleep != null && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Sleep:</strong> {avgSleep.toFixed(1)}h{sleepQuality ? ` (${sleepQuality})` : ''}
        </Typography>
      )}
      {totalMeals > 0 && (
        <Typography variant="caption" sx={{ display: 'block' }}>
          <strong>Meals:</strong> {totalMeals - refusedMeals}/{totalMeals} eaten
          {refusedMeals > 0 && ` — ${refusedMeals} refused`}
        </Typography>
      )}
      {handoff && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', opacity: 0.85 }}>
          Shift handoff recorded
        </Typography>
      )}

      {firstNote && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontStyle: 'italic', opacity: 0.85 }}>
          "{truncate(firstNote)}"
        </Typography>
      )}

      <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>
        Click to open this day
      </Typography>
    </Box>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function MoodCalendarHeatmap({ logs, startDate, endDate, onDayClick }: Props) {
  // Cap the heatmap's visual width so cells stay crisp on desktop.
  // react-calendar-heatmap scales SVG to container width — without a cap,
  // a 90-day grid on a 1100px card produces huge cartoonish cells.
  // Target ~36-40px per week column; still shrinks below this on narrow screens.
  const maxWidth = useMemo(() => {
    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    const numWeeks = Math.ceil(numDays / 7) + 1; // +1 to account for partial weeks
    const cellTarget = 40;
    const labelColumn = 40;
    return numWeeks * cellTarget + labelColumn;
  }, [startDate, endDate]);

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
      const dayLogs = byDate.get(key) ?? [];
      if (dayLogs.length === 0) {
        out.push({ date: key, mood: null, count: 0, logs: [] });
      } else {
        const worst = dayLogs.reduce((acc, cur) => (moodSeverity[cur.mood] > moodSeverity[acc.mood] ? cur : acc));
        out.push({ date: key, mood: worst.mood, count: dayLogs.length, logs: dayLogs });
      }
    }
    return out;
  }, [logs, startDate, endDate]);

  // Popper state for rich hover tooltip
  const [hovered, setHovered] = useState<{ value: DayValue; anchor: Element } | null>(null);

  return (
    <Box>
      {/* Targeted CSS — tighten labels, soften empty cells, style rects */}
      <GlobalStyles
        styles={{
          '.react-calendar-heatmap': {
            display: 'block',
          },
          '.react-calendar-heatmap-month-label': {
            fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
            fontSize: 9,
            fontWeight: 500,
            fill: '#8a8a8a',
            letterSpacing: '0.02em',
          },
          '.react-calendar-heatmap-weekday-label': {
            fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
            fontSize: 8,
            fontWeight: 400,
            fill: '#a0a0a0',
          },
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
            transition: 'opacity 120ms ease',
          },
          '.react-calendar-heatmap rect:hover': {
            opacity: 0.85,
            stroke: '#3A7D44',
            strokeWidth: 1.2,
          },
        }}
      />

      <Box sx={{ maxWidth: `${maxWidth}px`, width: '100%' }}>
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        gutterSize={3}
        showWeekdayLabels
        weekdayLabels={['', 'Mon', '', 'Wed', '', 'Fri', '']}
        classForValue={(v) => {
          const dv = v as DayValue | null;
          if (!dv || !dv.mood) return 'color-empty';
          return `color-mood-${dv.mood}`;
        }}
        onMouseOver={(event, v) => {
          const dv = v as DayValue | null;
          if (dv && event?.currentTarget) {
            setHovered({ value: dv, anchor: event.currentTarget as Element });
          }
        }}
        onMouseLeave={() => setHovered(null)}
        onClick={(v) => {
          const dv = v as DayValue | null;
          if (dv && onDayClick) onDayClick(dv.date);
        }}
        transformDayElement={((rectEl: unknown, v: unknown): React.ReactNode => {
          const dv = v as DayValue | null;
          const element = rectEl as React.ReactElement<{
            x?: number | string;
            y?: number | string;
            width?: number | string;
            height?: number | string;
          }>;
          // Add a tiny indicator dot in the corner for days with >1 entry.
          // Makes multi-entry days scannable without hovering; the tooltip
          // then reveals the full mood timeline.
          if (!dv || dv.count <= 1) return element;
          const x = Number(element.props.x ?? 0);
          const y = Number(element.props.y ?? 0);
          const w = Number(element.props.width ?? 0);
          const h = Number(element.props.height ?? 0);
          // Bottom-right corner, nudged inward. White outer ring + dark inner dot
          // so it reads on both light and dark cells.
          return (
            <g>
              {element}
              <circle
                cx={x + w - 3}
                cy={y + h - 3}
                r={2}
                fill="rgba(255,255,255,0.9)"
                pointerEvents="none"
              />
              <circle
                cx={x + w - 3}
                cy={y + h - 3}
                r={1}
                fill="rgba(30,28,32,0.75)"
                pointerEvents="none"
              />
            </g>
          );
        }) as unknown as React.ComponentProps<typeof CalendarHeatmap>['transformDayElement']}
      />
      </Box>

      {/* Rich hover tooltip via Popper — anchors to the hovered SVG rect */}
      <Popper
        open={Boolean(hovered)}
        anchorEl={hovered?.anchor}
        placement="top"
        transition
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 8 } },
        ]}
        sx={{ zIndex: (t) => t.zIndex.tooltip, pointerEvents: 'none' }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={120}>
            <Paper
              elevation={6}
              sx={{
                bgcolor: 'rgba(30,28,32,0.96)',
                color: 'white',
                borderRadius: 1.5,
                '& .MuiTypography-root': { color: 'inherit' },
              }}
            >
              {hovered && <DayTooltipContent value={hovered.value} />}
            </Paper>
          </Fade>
        )}
      </Popper>

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
        <Tooltip title="Day with more than one entry — hover to see the mood timeline" arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: moodColors.calm,
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: 1,
                  bottom: 1,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'rgba(30,28,32,0.75)',
                  border: '1px solid rgba(255,255,255,0.9)',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">Multiple entries</Typography>
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export { moodColors, moodLabels };
