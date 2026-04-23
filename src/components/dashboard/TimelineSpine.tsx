import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface SpineEvent {
  id: string;
  time: Date;
  /** Kind drives the dot color + icon. */
  kind: 'care-log' | 'visit' | 'task' | 'med';
  title: string;
  subtitle?: string;
  /** Optional accent color for the dot (overrides the kind-derived color). */
  accent?: string;
  /** Icon to show inside the content card. */
  icon?: ReactNode;
  /** Navigate / click handler for the event row. */
  onClick?: () => void;
}

interface Props {
  events: SpineEvent[];
  emptyMessage?: string;
  loading?: boolean;
  /**
   * Whether the current-time indicator line is shown. Defaults to true for
   * "today" views; disable for historical views (Care Log past days).
   */
  showNow?: boolean;
}

const KIND_COLORS: Record<SpineEvent['kind'], string> = {
  'care-log': '#7C6F9B',  // plum — care log entries
  visit: '#3A7D44',       // green — visits
  task: '#C48B2E',        // ochre — tasks
  med: '#B45A3E',         // clay — medications
};

/**
 * Vertical "spine" layout — a time ribbon running down the left side with
 * events strung along it. The day hangs on the spine; events are the beads.
 *
 * Not a chart — the spine's job is to anchor the rhythm of the day visually.
 * Gaps between events are compressed (no empty minute-by-minute space); the
 * spine is continuous but events stack naturally.
 *
 * Events should arrive pre-sorted by time (oldest → newest).
 */
export default function TimelineSpine({ events, emptyMessage, loading, showNow = true }: Props) {
  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Loading today…
      </Typography>
    );
  }

  if (events.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage ?? 'A quiet day so far.'}
        </Typography>
      </Box>
    );
  }

  const now = new Date();
  // Find the insertion index for "now" so we can render the indicator row.
  const nowIdx = events.findIndex((e) => e.time.getTime() > now.getTime());
  const insertNowAt = nowIdx === -1 ? events.length : nowIdx;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Vertical spine line — always present behind events */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          bottom: 12,
          left: 56,
          width: '1.5px',
          bgcolor: 'divider',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {events.map((event, idx) => (
          <Box key={event.id}>
            {showNow && idx === insertNowAt && <NowIndicator />}
            <EventRow event={event} />
          </Box>
        ))}
        {showNow && insertNowAt === events.length && <NowIndicator />}
      </Box>
    </Box>
  );
}

function EventRow({ event }: { event: SpineEvent }) {
  const color = event.accent ?? KIND_COLORS[event.kind];
  const isInteractive = Boolean(event.onClick);

  return (
    <Box
      onClick={event.onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                event.onClick?.();
              }
            }
          : undefined
      }
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        cursor: isInteractive ? 'pointer' : 'default',
        p: 1.5,
        mx: -1.5,
        borderRadius: 2,
        transition: 'background-color 120ms',
        '&:hover': isInteractive ? { bgcolor: 'rgba(26,22,18,0.04)' } : {},
      }}
    >
      {/* Time column (mono, plum, wide tracking) */}
      <Box sx={{ width: 48, flexShrink: 0, textAlign: 'right', pt: 0.25 }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 11,
            fontWeight: 500,
            color: 'text.secondary',
            letterSpacing: '0.04em',
          }}
        >
          {formatTime(event.time)}
        </Typography>
      </Box>

      {/* Dot anchor — sits on the spine */}
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          flexShrink: 0,
          mt: 0.6,
          bgcolor: color,
          border: '2px solid',
          borderColor: 'background.default',
          boxShadow: `0 0 0 1.5px ${color}`,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, pl: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {event.icon && (
            <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              {event.icon}
            </Box>
          )}
          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.35 }}>
            {event.title}
          </Typography>
        </Box>
        {event.subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {event.subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function NowIndicator() {
  const now = new Date();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, position: 'relative' }}>
      <Box sx={{ width: 48, flexShrink: 0, textAlign: 'right' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 600,
            color: 'primary.main',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Now
        </Typography>
      </Box>
      <Box sx={{ width: 12, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 0 3px rgba(58,125,68,0.2)' }} />
      </Box>
      <Box
        sx={{
          flex: 1,
          height: '1.5px',
          background: 'linear-gradient(to right, rgba(58,125,68,0.4), rgba(58,125,68,0))',
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10 }}>
        {formatTime(now)}
      </Typography>
    </Box>
  );
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')}${period}`;
}
