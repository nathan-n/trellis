import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Fuse from 'fuse.js';
import { useTasks } from '../../hooks/useTasks';
import { TaskCategory, TaskStatus } from '../../constants';
import TaskCard from './TaskCard';
import TaskSearchBar from './TaskSearchBar';
import TaskCreateEditDialog from './TaskCreateEditDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function TaskListPage() {
  const { tasks, loading } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const fuse = useMemo(
    () =>
      new Fuse(tasks, {
        keys: ['title', 'description', 'location', 'rationale'],
        threshold: 0.4,
      }),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((t) => t.status !== TaskStatus.DONE);
    } else if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery);
      const matchIds = new Set(fuseResults.map((r) => r.item.id));
      result = result.filter((t) => matchIds.has(t.id));
    }

    return result;
  }, [tasks, statusFilter, categoryFilter, searchQuery, fuse]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Tasks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Task
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3, alignItems: 'center' }}>
        <TaskSearchBar onSearch={setSearchQuery} />

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, val) => val && setStatusFilter(val)}
          size="small"
        >
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value={TaskCategory.MEDICAL}>Medical</MenuItem>
            <MenuItem value={TaskCategory.LEGAL}>Legal</MenuItem>
            <MenuItem value={TaskCategory.FINANCIAL}>Financial</MenuItem>
            <MenuItem value={TaskCategory.GENERAL}>General</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<TaskAltIcon />}
          title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
          description={
            tasks.length === 0
              ? 'Create your first task to start coordinating care.'
              : 'Try adjusting your filters or search terms.'
          }
          actionLabel={tasks.length === 0 ? 'Create Task' : undefined}
          onAction={tasks.length === 0 ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <Stack spacing={1.5}>
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </Stack>
      )}

      <TaskCreateEditDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
