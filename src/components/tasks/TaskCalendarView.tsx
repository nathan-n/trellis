import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Calendar, dayjsLocalizer, type Event } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTasks } from '../../hooks/useTasks';
import LoadingSpinner from '../shared/LoadingSpinner';

const localizer = dayjsLocalizer(dayjs);

const categoryColors: Record<string, string> = {
  medical: '#1976d2',
  legal: '#7b1fa2',
  financial: '#ed6c02',
  general: '#2e7d32',
};

interface TaskEvent extends Event {
  taskId: string;
  category: string;
}

export default function TaskCalendarView() {
  const { tasks, loading } = useTasks();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());

  const events: TaskEvent[] = useMemo(
    () =>
      tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          taskId: t.id,
          title: t.title,
          start: t.dueDate!.toDate(),
          end: t.dueDate!.toDate(),
          allDay: true,
          category: t.category,
        })),
    [tasks]
  );

  const eventStyleGetter = useCallback((event: TaskEvent) => ({
    style: {
      backgroundColor: categoryColors[event.category] ?? '#2e7d32',
      borderRadius: '4px',
      color: '#fff',
      border: 'none',
      fontSize: '0.8rem',
    },
  }), []);

  const handleSelectEvent = useCallback(
    (event: TaskEvent) => navigate(`/tasks/${event.taskId}`),
    [navigate]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Task Calendar
      </Typography>
      <Box sx={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <Calendar<TaskEvent>
          localizer={localizer}
          events={events}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week']}
          defaultView="month"
          popup
        />
      </Box>
    </Box>
  );
}
