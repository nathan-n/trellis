import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Link,
  Stack,
  Avatar,
  AvatarGroup,
  Tooltip,
  IconButton,
  Tab,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RepeatIcon from '@mui/icons-material/Repeat';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs from 'dayjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { canUserSeeTask } from '../../utils/taskVisibility';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useCircleMembers } from '../../hooks/useCircleMembers';
import { deleteTask, completeRecurringTask, updateTask } from '../../services/taskService';
import { formatDateTime } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { Task } from '../../types';
import TaskCreateEditDialog from './TaskCreateEditDialog';
import TaskComments from './TaskComments';
import TaskAttachments from './TaskAttachments';
import TaskQuestions from './TaskQuestions';
import ConfirmDialog from '../shared/ConfirmDialog';
import LoadingSpinner from '../shared/LoadingSpinner';

const priorityColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
};

const categoryLabels: Record<string, string> = {
  medical: 'Medical',
  legal: 'Legal',
  financial: 'Financial',
  general: 'General',
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const { members } = useCircleMembers();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState('comments');

  useEffect(() => {
    if (!activeCircle || !taskId) return;
    const unsubscribe = onSnapshot(
      doc(db, 'circles', activeCircle.id, 'tasks', taskId),
      (snap) => {
        if (snap.exists()) {
          setTask({ id: snap.id, ...snap.data() } as Task);
        } else {
          setTask(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Task detail error:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [activeCircle?.id, taskId]);

  const handleComplete = async () => {
    if (!activeCircle || !task || !userProfile) return;
    try {
      if (task.recurrence) {
        const nextId = await completeRecurringTask(activeCircle.id, task, userProfile.uid, userProfile.displayName);
        showMessage(nextId ? 'Completed — next occurrence created' : 'Task completed', 'success');
        if (nextId) navigate(`/tasks/${nextId}`);
      } else {
        await updateTask(activeCircle.id, task.id, userProfile.uid, userProfile.displayName, { status: 'done' });
        showMessage('Task completed', 'success');
      }
    } catch {
      showMessage('Failed to complete task', 'error');
    }
  };

  const handleDelete = async () => {
    if (!activeCircle || !taskId || !userProfile) return;
    try {
      await deleteTask(activeCircle.id, taskId, userProfile.uid, userProfile.displayName);
      showMessage('Task deleted', 'success');
      navigate('/tasks');
    } catch {
      showMessage('Failed to delete task', 'error');
    }
    setDeleteOpen(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!task || (userProfile && !canUserSeeTask(task, userProfile.uid, role))) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6">Task not found</Typography>
        <Button onClick={() => navigate('/tasks')} sx={{ mt: 2 }}>
          Back to Tasks
        </Button>
      </Box>
    );
  }

  const assignees = members.filter((m) => task.assigneeUids?.includes(m.uid));
  const canEdit = role && hasMinRole(role, CircleRole.PROFESSIONAL);
  const canDelete = role && hasMinRole(role, CircleRole.ADMIN);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tasks')} sx={{ mb: 2 }}>
        Back to Tasks
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {task.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={task.priority}
                  size="small"
                  color={priorityColors[task.priority] ?? 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
                <Chip label={statusLabels[task.status] ?? task.status} size="small" variant="outlined" />
                <Chip label={categoryLabels[task.category] ?? task.category} size="small" variant="outlined" />
                {task.recurrence && (
                  <Chip icon={<RepeatIcon />} label={`Repeats ${task.recurrence.frequency}`} size="small" color="secondary" variant="outlined" />
                )}
                {task.visibility === 'private' && (
                  <Chip icon={<LockIcon />} label="Private" size="small" variant="outlined" />
                )}
                {task.visibility === 'specific' && (
                  <Chip icon={<PeopleIcon />} label={`Shared with ${task.visibleToUids?.length ?? 0}`} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {canEdit && task.status !== 'done' && (
                <Tooltip title={task.recurrence ? 'Complete & create next' : 'Mark complete'}>
                  <IconButton color="success" onClick={handleComplete}>
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
              )}
              {canEdit && (
                <IconButton onClick={() => setEditOpen(true)}>
                  <EditIcon />
                </IconButton>
              )}
              {canDelete && (
                <IconButton color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {task.description && (
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.5}>
            {task.dueDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body2">Due: {formatDateTime(task.dueDate)}</Typography>
              </Box>
            )}

            {task.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body2">{task.location}</Typography>
              </Box>
            )}

            {assignees.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">Assigned to:</Typography>
                <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 13 } }}>
                  {assignees.map((a) => (
                    <Tooltip key={a.uid} title={a.displayName}>
                      <Avatar src={a.photoURL || undefined}>{a.displayName?.[0]?.toUpperCase()}</Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Box>
            )}

            {/* Appointment details */}
            {task.subtype === 'appointment' && task.appointmentDetails && (
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: 1, borderColor: 'primary.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocalHospitalIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" color="primary">Doctor Appointment</Typography>
                </Box>
                {task.appointmentDetails.doctorName && (
                  <Typography variant="body2">Doctor: <strong>{task.appointmentDetails.doctorName}</strong></Typography>
                )}
                {task.appointmentDetails.location && (
                  <Typography variant="body2">Location: {task.appointmentDetails.location}</Typography>
                )}
                {task.appointmentDetails.appointmentType && (
                  <Chip
                    label={task.appointmentDetails.appointmentType.replace('_', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 0.5, textTransform: 'capitalize' }}
                  />
                )}
                {task.dueDate && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SummarizeIcon />}
                    sx={{ mt: 1.5 }}
                    onClick={() => {
                      const apptDate = dayjs(task.dueDate!.toDate());
                      const from = apptDate.subtract(30, 'day').format('YYYY-MM-DD');
                      const to = apptDate.format('YYYY-MM-DD');
                      navigate(`/doctor-prep?from=${from}&to=${to}&taskId=${task.id}`);
                    }}
                  >
                    Prepare for Visit
                  </Button>
                )}
                <Box sx={{ mt: 2 }}>
                  <TaskQuestions taskId={task.id} />
                </Box>
              </Box>
            )}

            {task.rationale && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Rationale
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {task.rationale}
                </Typography>
              </Box>
            )}

            {task.resourceLinks?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Resources
                </Typography>
                {task.resourceLinks.map((link, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LinkIcon fontSize="small" color="action" />
                    <Link href={link} target="_blank" rel="noopener noreferrer" variant="body2">
                      {link}
                    </Link>
                  </Box>
                ))}
              </Box>
            )}

            {task.pointsOfContact?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Points of Contact
                </Typography>
                <Stack spacing={1}>
                  {task.pointsOfContact.map((poc, i) => (
                    <Box key={i} sx={{ pl: 1, borderLeft: 2, borderColor: 'primary.light' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {poc.name}
                      </Typography>
                      {poc.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14 }} color="action" />
                          <Link href={`tel:${poc.phone}`} variant="body2">
                            {poc.phone}
                          </Link>
                        </Box>
                      )}
                      {poc.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 14 }} color="action" />
                          <Link href={`mailto:${poc.email}`} variant="body2">
                            {poc.email}
                          </Link>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <TabContext value={tab}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={(_, v) => setTab(v)}>
              <Tab label="Comments" value="comments" />
              <Tab label="Attachments" value="attachments" />
            </TabList>
          </Box>
          <TabPanel value="comments">
            <TaskComments taskId={task.id} />
          </TabPanel>
          <TabPanel value="attachments">
            <TaskAttachments taskId={task.id} />
          </TabPanel>
        </TabContext>
      </Card>

      <TaskCreateEditDialog open={editOpen} onClose={() => setEditOpen(false)} task={task} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        destructive
      />
    </Box>
  );
}
