import { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NoteAltIcon from '@mui/icons-material/NoteAltOutlined';
import EventIcon from '@mui/icons-material/EventOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeCareLogsByDate } from '../../services/careLogService';
import { subscribeVisitsByDateRange } from '../../services/visitService';
import { useTasks } from '../../hooks/useTasks';
import type { CareLog, Visit, Task } from '../../types';
import { moodColors } from '../analytics/MoodCalendarHeatmap';
import TimelineSpine, { type SpineEvent } from './TimelineSpine';
import SerifAccent from '../shared/SerifAccent';

/**
 * Home dashboard's "today's spine" — merges care logs, visits, and tasks
 * due today (assigned to the viewer) into a single chronological ribbon.
 * Replaces the previous three separate cards (Today Snapshot, My Tasks,
 * Upcoming Visits) with a unified view of the day's rhythm.
 */
export default function TodaySpine() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { tasks } = useTasks();

  const today = dayjs().format('YYYY-MM-DD');
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);

  // Subscribe to today's care logs
  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeCareLogsByDate(
      activeCircle.id,
      today,
      (data) => { setCareLogs(data); setLoadingLogs(false); },
      () => setLoadingLogs(false)
    );
    return unsubscribe;
  }, [activeCircle?.id, today]);

  // Subscribe to today's visits (same-day range)
  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeVisitsByDateRange(
      activeCircle.id,
      today,
      today,
      (data) => { setVisits(data); setLoadingVisits(false); },
      () => setLoadingVisits(false)
    );
    return unsubscribe;
  }, [activeCircle?.id, today]);

  // Build spine events: today's care logs + today's visits + tasks due today for me
  const events: SpineEvent[] = useMemo(() => {
    const out: SpineEvent[] = [];
    const uid = userProfile?.uid;
    const todayStart = dayjs(today).startOf('day');
    const todayEnd = dayjs(today).endOf('day');

    for (const log of careLogs) {
      const t = log.logTimestamp?.toDate?.();
      if (!t) continue;
      out.push({
        id: `log-${log.id}`,
        time: t,
        kind: 'care-log',
        title: log.authorName
          ? `${log.authorName} logged ${log.mood}`
          : `Logged ${log.mood}`,
        subtitle: log.generalNotes || log.moodNotes || undefined,
        accent: moodColors[log.mood] ?? undefined,
        icon: <NoteAltIcon sx={{ fontSize: 16 }} />,
        onClick: () => navigate('/care-log'),
      });
    }

    for (const v of visits) {
      const t = v.startTime?.toDate?.();
      if (!t) continue;
      out.push({
        id: `visit-${v.id}`,
        time: t,
        kind: 'visit',
        title: `${v.caregiverName} is here`,
        subtitle: v.endTime
          ? `Until ${dayjs(v.endTime.toDate()).format('h:mma')}`
          : undefined,
        icon: <EventIcon sx={{ fontSize: 16 }} />,
        onClick: () => navigate('/visits'),
      });
    }

    // Tasks due today that are assigned to me and still open
    for (const t of tasks) {
      if (t.status === 'done') continue;
      if (!t.dueDate || !uid) continue;
      if (!t.assigneeUids?.includes(uid)) continue;
      const due = dayjs(t.dueDate.toDate());
      if (due.isBefore(todayStart) || due.isAfter(todayEnd)) continue;
      out.push({
        id: `task-${t.id}`,
        time: due.toDate(),
        kind: 'task',
        title: t.title,
        subtitle: t.priority === 'urgent' || t.priority === 'high'
          ? `${t.priority} priority`
          : undefined,
        icon: <TaskAltIcon sx={{ fontSize: 16 }} />,
        onClick: () => navigate(`/tasks/${t.id}`),
      });
    }

    out.sort((a, b) => a.time.getTime() - b.time.getTime());
    return out;
  }, [careLogs, visits, tasks, userProfile?.uid, today, navigate]);

  const loading = loadingLogs || loadingVisits;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        {/* Page-level date overline now lives on DashboardPage. Section
            heading reads "Your rhythm" — matches the review's preferred
            section-within-Today structure (finding 02). */}
        <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
          Your <SerifAccent>rhythm</SerifAccent>
        </Typography>
      </Box>

      <TimelineSpine
        events={events}
        loading={loading}
        emptyMessage="A quiet day so far. Check back as the day unfolds."
      />
    </Box>
  );
}

// Re-export a placeholder for ranges using tasks (not actually used — just
// silence the lint noise on unused type imports).
export type _TaskSanity = Pick<Task, 'id'>;
