import { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Chip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Calendar, dayjsLocalizer, type Event } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeVisits, deleteVisit } from '../../services/visitService';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../utils/dateUtils';
import type { Visit } from '../../types';
import VisitCreateEditDialog from './VisitCreateEditDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import LoadingSpinner from '../shared/LoadingSpinner';

const localizer = dayjsLocalizer(dayjs);

const caregiverColors = [
  '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f', '#f57c00',
  '#0097a7', '#5d4037', '#455a64', '#c2185b', '#00796b',
];

interface VisitEvent extends Event {
  visitId: string;
  visit: Visit;
  color: string;
}

export default function VisitCalendarPage() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Visit | null>(null);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeVisits(
      activeCircle.id,
      (data) => { setVisits(data); setLoading(false); },
      (err) => { console.error('Visits error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    const uids = [...new Set(visits.map((v) => v.caregiverUid))];
    uids.forEach((uid, i) => map.set(uid, caregiverColors[i % caregiverColors.length]));
    return map;
  }, [visits]);

  const events: VisitEvent[] = useMemo(
    () =>
      visits
        .filter((v) => v.status !== 'cancelled')
        .map((v) => ({
          visitId: v.id,
          visit: v,
          title: `${v.caregiverName} (${formatTime(v.startTime)} - ${formatTime(v.endTime)})`,
          start: v.startTime.toDate(),
          end: v.endTime.toDate(),
          color: colorMap.get(v.caregiverUid) ?? '#666',
        })),
    [visits, colorMap]
  );

  const eventStyleGetter = useCallback(
    (event: VisitEvent) => ({
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        color: '#fff',
        border: 'none',
      },
    }),
    []
  );

  const handleSelectEvent = useCallback((event: VisitEvent) => {
    setEditVisit(event.visit);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteVisit(activeCircle.id, deleteTarget.id, userProfile.uid, userProfile.displayName);
      showMessage('Visit deleted', 'success');
    } catch {
      showMessage('Failed to delete visit', 'error');
    }
    setDeleteTarget(null);
  };

  // Coverage gap detection — find days in the next 7 days with no visits
  const coverageGaps = useMemo(() => {
    const gaps: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = dayjs().add(i, 'day');
      const dayStr = day.format('YYYY-MM-DD');
      const hasVisit = visits.some(
        (v) => v.status !== 'cancelled' && dayjs(v.startTime.toDate()).format('YYYY-MM-DD') === dayStr
      );
      if (!hasVisit) gaps.push(day.format('ddd, MMM D'));
    }
    return gaps;
  }, [visits]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Visit Schedule</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Schedule Visit
        </Button>
      </Box>

      {coverageGaps.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Coverage gaps in the next 7 days
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {coverageGaps.map((day) => (
                <Chip key={day} label={day} size="small" color="warning" variant="outlined" />
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      <Box sx={{ height: 'calc(100vh - 260px)', minHeight: 500 }}>
        <Calendar<VisitEvent>
          localizer={localizer}
          events={events}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="week"
          popup
        />
      </Box>

      <VisitCreateEditDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <VisitCreateEditDialog
        open={Boolean(editVisit)}
        onClose={() => setEditVisit(null)}
        visit={editVisit}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Visit"
        message="Are you sure you want to delete this visit?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </Box>
  );
}
