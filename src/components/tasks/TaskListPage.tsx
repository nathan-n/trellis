import { useState, useMemo } from 'react';
import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import Fuse from 'fuse.js';
import { useTasks } from '../../hooks/useTasks';
import { useTaskViewed } from '../../hooks/useTaskViewed';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { TaskCategory, TaskStatus, CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import TaskCard from './TaskCard';
import TaskSearchBar from './TaskSearchBar';
import TaskCreateEditDialog from './TaskCreateEditDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import AddFab from '../shared/AddFab';
import PageHeader from '../shared/PageHeader';
import dayjs from 'dayjs';

export default function TaskListPage() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { tasks, loading } = useTasks();
  const canCreate = Boolean(role && hasMinRole(role, CircleRole.PROFESSIONAL));
  const { isTaskUnseen } = useTaskViewed(activeCircle?.id, userProfile?.uid);
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

    // Review finding 10: Active view default-sort by due date ascending.
    // Previously the order was whatever Firestore returned — a task with
    // no due date could sit above one due tomorrow. Now:
    //   - Active: ascending by due date; no-due-date tasks sink to bottom
    //   - Other views: keep Firestore order (preserves completed-at sort)
    if (statusFilter === 'active' && !searchQuery.trim()) {
      result = [...result].sort((a, b) => {
        const aDue = a.dueDate?.toMillis?.();
        const bDue = b.dueDate?.toMillis?.();
        if (aDue == null && bDue == null) return 0;
        if (aDue == null) return 1;
        if (bDue == null) return -1;
        return aDue - bDue;
      });
    }

    return result;
  }, [tasks, statusFilter, categoryFilter, searchQuery, fuse]);

  // Dynamic page-header context (review finding 05 + finding 10):
  //  "N active · M due today"  — tells the user at a glance whether they
  //  need to scroll. Counts are computed over the full task list, not the
  //  filtered view, so the overline stays stable across filter changes.
  const headerOverline = useMemo(() => {
    const active = tasks.filter((t) => t.status !== TaskStatus.DONE);
    const startToday = dayjs().startOf('day');
    const endToday = dayjs().endOf('day');
    const dueToday = active.filter(
      (t) => t.dueDate && !dayjs(t.dueDate.toDate()).isBefore(startToday) && !dayjs(t.dueDate.toDate()).isAfter(endToday)
    );
    if (tasks.length === 0) return 'No tasks yet';
    if (dueToday.length > 0) {
      return `${active.length} active · ${dueToday.length} due today`;
    }
    return `${active.length} active`;
  }, [tasks]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader overline={headerOverline} title="Tasks" />

      {/* Search on its own row on mobile (xs) so the status + category
          controls below don't wrap into 3 rows on a 390px viewport.
          Review finding 10. */}
      <Box sx={{ mb: { xs: 1.5, sm: 0 } }}>
        <TaskSearchBar onSearch={setSearchQuery} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3, alignItems: 'center' }}>
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
        <Stack spacing={1.5} sx={{ pb: 10 }}>
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} isUnseen={isTaskUnseen(task)} />
          ))}
        </Stack>
      )}

      <TaskCreateEditDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <AddFab label="New Task" onClick={() => setCreateOpen(true)} visible={canCreate} />
    </Box>
  );
}
