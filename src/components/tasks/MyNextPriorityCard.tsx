import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeMyPriorityTask } from '../../services/taskService';
import { formatDateTime } from '../../utils/dateUtils';
import type { Task } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';

const priorityColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const categoryLabels: Record<string, string> = {
  medical: 'Medical',
  legal: 'Legal',
  financial: 'Financial',
  general: 'General',
};

export default function MyNextPriorityCard() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null | undefined>(undefined);

  useEffect(() => {
    if (!activeCircle || !userProfile) {
      setTask(null);
      return;
    }

    const unsubscribe = subscribeMyPriorityTask(
      activeCircle.id,
      userProfile.uid,
      (t) => setTask(t),
      (err) => {
        console.error('Priority task error:', err);
        setTask(null);
      }
    );

    return unsubscribe;
  }, [activeCircle?.id, userProfile?.uid]);

  if (task === undefined) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        My Next Priority
      </Typography>

      {task === null ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <PriorityHighIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              You're all caught up
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              No active tasks assigned to you right now.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/tasks')}>
              View All Tasks
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardActionArea onClick={() => navigate(`/tasks/${task.id}`)}>
            <CardContent sx={{ py: 4, px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4" fontWeight={600}>
                  {task.title}
                </Typography>
                <Chip
                  label={task.priority}
                  color={priorityColors[task.priority] ?? 'default'}
                  sx={{ textTransform: 'capitalize', fontSize: '0.9rem' }}
                />
              </Box>

              {task.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {task.description}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={categoryLabels[task.category] ?? task.category}
                  size="small"
                  variant="outlined"
                />
                {task.dueDate && (
                  <Chip
                    label={`Due: ${formatDateTime(task.dueDate)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {task.location && (
                  <Chip label={task.location} size="small" variant="outlined" />
                )}
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', mt: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Open task details
                </Typography>
                <ArrowForwardIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      )}
    </Box>
  );
}
