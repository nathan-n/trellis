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
import { CircleRole } from '../../constants';

const moodColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
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
}

export default function CareLogTimeline({ logs, onEdit, onDelete }: CareLogTimelineProps) {
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

  return (
    <Stack spacing={2}>
      {logs.map((log) => (
        <Card key={log.id} variant={log.isShiftHandoff ? 'elevation' : 'outlined'} sx={log.isShiftHandoff ? { borderLeft: 4, borderLeftColor: 'primary.main' } : {}}>
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
              <Chip label={`Mood: ${log.mood}`} size="small" color={moodColors[log.mood] ?? 'default'} />
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
      ))}
    </Stack>
  );
}
