import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  Chip,
  AvatarGroup,
  Avatar,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import { useCircleMembers } from '../../hooks/useCircleMembers';
import { TASK_STATUS_LABELS, TASK_CATEGORY_LABELS } from '../../constants';
import type { Task } from '../../types';

const priorityColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const statusLabels = TASK_STATUS_LABELS;
const categoryLabels = TASK_CATEGORY_LABELS;

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate();
  const { members } = useCircleMembers();

  const assignees = members.filter((m) => task.assigneeUids.includes(m.uid));

  return (
    <Card>
      <CardActionArea onClick={() => navigate(`/tasks/${task.id}`)}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
              {task.title}
            </Typography>
            <Chip
              label={task.priority}
              size="small"
              color={priorityColors[task.priority] ?? 'default'}
              sx={{ textTransform: 'capitalize', ml: 1 }}
            />
          </Box>

          {task.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} noWrap>
              {task.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={categoryLabels[task.category] ?? task.category} size="small" variant="outlined" />
            <Chip label={statusLabels[task.status] ?? task.status} size="small" variant="outlined" />
            {task.subtype === 'appointment' && (
              <Chip icon={<LocalHospitalIcon />} label={task.appointmentDetails?.appointmentType?.replace('_', ' ') ?? 'Appointment'} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
            )}
            {task.recurrence && (
              <Chip label={`Repeats ${task.recurrence.frequency}`} size="small" color="secondary" variant="outlined" />
            )}
            {task.visibility === 'private' && (
              <Chip icon={<LockIcon />} label="Private" size="small" variant="outlined" />
            )}
            {task.visibility === 'specific' && (
              <Chip icon={<PeopleIcon />} label="Shared" size="small" variant="outlined" />
            )}
            {task.dueDate && (
              <Typography variant="caption" color="text.secondary">
                Due: {formatDate(task.dueDate)}
              </Typography>
            )}
            {assignees.length > 0 && (
              <Box sx={{ ml: 'auto' }}>
                <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                  {assignees.map((a) => (
                    <Tooltip key={a.uid} title={a.displayName}>
                      <Avatar src={a.photoURL || undefined} sx={{ width: 24, height: 24 }}>
                        {a.displayName?.[0]?.toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Box>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
