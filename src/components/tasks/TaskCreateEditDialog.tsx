import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  Divider,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs, { type Dayjs } from 'dayjs';
import { TaskCategory, TaskPriority, TaskStatus } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useCircleMembers } from '../../hooks/useCircleMembers';
import { createTask, updateTask, type CreateTaskData } from '../../services/taskService';
import type { Task, PointOfContact } from '../../types';

interface TaskCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
}

const emptyContact: PointOfContact = { name: '', phone: '', email: '' };

export default function TaskCreateEditDialog({ open, onClose, task }: TaskCreateEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const { members } = useCircleMembers();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(TaskCategory.GENERAL);
  const [priority, setPriority] = useState<string>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<string>(TaskStatus.TODO);
  const [assigneeUids, setAssigneeUids] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [location, setLocation] = useState('');
  const [resourceLinks, setResourceLinks] = useState('');
  const [rationale, setRationale] = useState('');
  const [contacts, setContacts] = useState<PointOfContact[]>([]);
  const [recurrenceFreq, setRecurrenceFreq] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('circle');
  const [visibleToUids, setVisibleToUids] = useState<string[]>([]);

  const isEdit = Boolean(task);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setCategory(task.category);
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeUids(task.assigneeUids);
      setDueDate(task.dueDate ? dayjs(task.dueDate.toDate()) : null);
      setLocation(task.location ?? '');
      setResourceLinks(task.resourceLinks?.join('\n') ?? '');
      setRationale(task.rationale ?? '');
      setContacts(task.pointsOfContact?.length ? task.pointsOfContact : []);
      setRecurrenceFreq(task.recurrence?.frequency ?? '');
      setVisibility(task.visibility ?? 'circle');
      setVisibleToUids(task.visibleToUids ?? []);
    } else {
      resetForm();
    }
  }, [task, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(TaskCategory.GENERAL);
    setPriority(TaskPriority.MEDIUM);
    setStatus(TaskStatus.TODO);
    setAssigneeUids([]);
    setDueDate(null);
    setLocation('');
    setResourceLinks('');
    setRationale('');
    setContacts([]);
    setRecurrenceFreq('');
    setVisibility('circle');
    setVisibleToUids([]);
  };

  const handleSave = async () => {
    if (!title.trim() || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      const data: CreateTaskData = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        assigneeUids,
        dueDate: dueDate ? dueDate.toDate() : null,
        location: location.trim() || null,
        resourceLinks: resourceLinks
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        rationale: rationale.trim() || null,
        pointsOfContact: contacts.filter((c) => c.name.trim()),
        recurrence: recurrenceFreq ? { frequency: recurrenceFreq } : null,
        visibility,
        visibleToUids: visibility === 'specific' ? visibleToUids : [],
      };

      if (isEdit && task) {
        await updateTask(activeCircle.id, task.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Task updated', 'success');
      } else {
        await createTask(activeCircle.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Task created', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save task error:', err);
      showMessage('Failed to save task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => setContacts([...contacts, { ...emptyContact }]);

  const updateContact = (index: number, field: keyof PointOfContact, value: string) => {
    setContacts(contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const categoryLabels: Record<string, string> = {
    medical: 'Medical',
    legal: 'Legal',
    financial: 'Financial',
    general: 'General',
  };

  const priorityLabels: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const statusLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    done: 'Done',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Task' : 'Create Task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <MenuItem key={val} value={val}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 130 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
                {Object.entries(priorityLabels).map(([val, label]) => (
                  <MenuItem key={val} value={val}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <MenuItem key={val} value={val}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Autocomplete
            multiple
            options={members}
            getOptionLabel={(m) => m.displayName}
            value={members.filter((m) => assigneeUids.includes(m.uid))}
            onChange={(_, val) => setAssigneeUids(val.map((m) => m.uid))}
            renderTags={(value, getTagProps) =>
              value.map((m, index) => (
                <Chip label={m.displayName} size="small" {...getTagProps({ index })} key={m.uid} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Assignees" />}
          />

          <FormControl fullWidth>
            <InputLabel>Visibility</InputLabel>
            <Select value={visibility} label="Visibility" onChange={(e) => setVisibility(e.target.value)}>
              <MenuItem value="circle">Entire Circle</MenuItem>
              <MenuItem value="private">Private (you + assignees)</MenuItem>
              <MenuItem value="specific">Specific People</MenuItem>
            </Select>
          </FormControl>

          {visibility === 'specific' && (
            <Autocomplete
              multiple
              options={members.filter((m) => m.uid !== userProfile?.uid)}
              getOptionLabel={(m) => m.displayName}
              value={members.filter((m) => visibleToUids.includes(m.uid) && m.uid !== userProfile?.uid)}
              onChange={(_, val) => setVisibleToUids(val.map((m) => m.uid))}
              renderTags={(value, getTagProps) =>
                value.map((m, index) => (
                  <Chip label={m.displayName} size="small" {...getTagProps({ index })} key={m.uid} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Visible To" helperText="You and assignees are always included" />
              )}
            />
          )}

          <DateTimePicker
            label="Due Date"
            value={dueDate}
            onChange={setDueDate}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Repeats</InputLabel>
            <Select value={recurrenceFreq} label="Repeats" onChange={(e) => setRecurrenceFreq(e.target.value)}>
              <MenuItem value="">One-time</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="biweekly">Every 2 Weeks</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
          />

          <TextField
            label="Rationale / Reason"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <TextField
            label="Resource Links (one per line)"
            value={resourceLinks}
            onChange={(e) => setResourceLinks(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="https://example.com"
          />

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Points of Contact</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addContact}>
                Add Contact
              </Button>
            </Box>
            {contacts.map((contact, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  label="Name"
                  size="small"
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Phone"
                  size="small"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Email"
                  size="small"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" onClick={() => removeContact(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!title.trim() || saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
