import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChecklistIcon from '@mui/icons-material/Checklist';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeTasks } from '../../services/taskService';
import type { Task } from '../../types';

export default function MyTasksCard() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeTasks(
      activeCircle.id,
      (data) => { setTasks(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const myOpen = useMemo(() => {
    if (!userProfile) return [];
    return tasks.filter(
      (t) => t.status !== 'done' && t.assigneeUids?.includes(userProfile.uid)
    );
  }, [tasks, userProfile?.uid]);

  const overdue = useMemo(() => {
    const now = dayjs();
    return myOpen.filter((t) => t.dueDate && dayjs(t.dueDate.toDate()).isBefore(now));
  }, [myOpen]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ChecklistIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            My Tasks
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : myOpen.length === 0 ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">No open tasks assigned to you.</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/tasks')}>
              View all
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700} sx={{ fontFamily: '"Playfair Display", serif', lineHeight: 1 }}>
              {myOpen.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              open task{myOpen.length !== 1 ? 's' : ''}
            </Typography>
            {overdue.length > 0 && (
              <Chip
                label={`${overdue.length} overdue`}
                size="small"
                color="error"
                variant="filled"
                sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
              />
            )}
            <Button size="small" onClick={() => navigate('/tasks')} sx={{ alignSelf: 'flex-start', px: 0 }}>
              See all →
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
