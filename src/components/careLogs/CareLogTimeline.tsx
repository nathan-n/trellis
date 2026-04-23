import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import { formatDateTime } from '../../utils/dateUtils';
import type { CareLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { CircleRole, Mood } from '../../constants';
import { moodColors as moodPaletteColors } from '../analytics/MoodCalendarHeatmap';

const moodChipColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  calm: 'success',
  happy: 'success',
  agitated: 'error',
  confused: 'warning',
  withdrawn: 'info',
  other: 'default',
};

interface CareLogTimelineProps {
  logs: CareLog[];
  onEdit?: (log: CareLog) => void;
  onDelete?: (log: CareLog) => void;
  /**
   * When true, render each log with a left-column time + spine dot + vertical
   * connector line. Used by the Care Log Day view (Direction C timeline-as-
   * spine treatment). Defaults to false so the History (grouped-by-day) view
   * keeps its existing layout.
   */
  showSpine?: boolean;
}

export default function CareLogTimeline({ logs, onEdit, onDelete, showSpine = false }: CareLogTimelineProps) {
  const { userProfile } = useAuth();
  const { role } = useCircle();
  const isAdmin = role === CircleRole.ADMIN;

  if (logs.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No entries for this date.
      </Typography>
    );
  }

  const renderCard = (log: CareLog) => (
    <Card
      variant={log.isShiftHandoff ? 'elevation' : 'outlined'}
      sx={log.isShiftHandoff ? { borderLeft: 4, borderLeftColor: 'primary.main' } : {}}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>
              {log.authorName?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="body2" fontWeight={600}>
              {log.authorName}
            </Typography>
            {log.isShiftHandoff && <Chip label="Handoff" size="small" color="primary" />}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(log.logTimestamp)}
            </Typography>
            {(isAdmin || log.authorUid === userProfile?.uid) && onEdit && (
              <Tooltip title="Edit entry" arrow>
                <IconButton size="small" onClick={() => onEdit(log)} sx={{ ml: 0.5 }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(isAdmin || log.authorUid === userProfile?.uid) && onDelete && (
              <Tooltip title="Delete entry" arrow>
                <IconButton size="small" color="error" onClick={() => onDelete(log)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
          <Chip label={`Mood: ${log.mood}`} size="small" color={moodChipColors[log.mood] ?? 'default'} />
          <Chip label={`Sleep: ${log.sleep?.quality ?? 'N/A'}${log.sleep?.hoursSlept ? ` (${log.sleep.hoursSlept}h)` : ''}`} size="small" variant="outlined" />
          {log.meals?.length > 0 && <Chip label={`${log.meals.length} meal(s)`} size="small" variant="outlined" />}
        </Stack>

        {log.behaviors?.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Behaviors:</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {log.behaviors.map((b, i) => <Chip key={i} label={b} size="small" variant="outlined" />)}
            </Stack>
          </Box>
        )}

        {log.activities?.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Activities:</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {log.activities.map((a, i) => <Chip key={i} label={a} size="small" color="primary" variant="outlined" />)}
            </Stack>
          </Box>
        )}

        {log.generalNotes && (
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {log.generalNotes}
          </Typography>
        )}

        {log.isShiftHandoff && log.shiftSummary && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="primary">Handoff Summary</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {log.shiftSummary}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (!showSpine) {
    return <Stack spacing={2}>{logs.map((log) => <Box key={log.id}>{renderCard(log)}</Box>)}</Stack>;
  }

  // Spine layout — left time-column + connector + mood-colored dot per entry
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          bottom: 20,
          left: 56,
          width: '1.5px',
          bgcolor: 'divider',
          pointerEvents: 'none',
        }}
      />
      <Stack spacing={2}>
        {logs.map((log) => {
          const dotColor = moodPaletteColors[log.mood as Mood] ?? '#9E9E9E';
          return (
            <Box key={log.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Time column */}
              <Box sx={{ width: 48, flexShrink: 0, textAlign: 'right', pt: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'text.secondary',
                    letterSpacing: '0.04em',
                  }}
                >
                  {log.logTimestamp?.toDate
                    ? formatHm(log.logTimestamp.toDate())
                    : ''}
                </Typography>
              </Box>
              {/* Dot anchor */}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  flexShrink: 0,
                  mt: 2.3,
                  bgcolor: dotColor,
                  border: '2px solid',
                  borderColor: 'background.default',
                  boxShadow: `0 0 0 1.5px ${dotColor}`,
                  zIndex: 1,
                }}
              />
              {/* Card */}
              <Box sx={{ flex: 1, minWidth: 0 }}>{renderCard(log)}</Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function formatHm(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')}${period}`;
}
