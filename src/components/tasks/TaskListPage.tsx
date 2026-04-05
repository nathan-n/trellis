import { Box, Typography } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EmptyState from '../shared/EmptyState';

export default function TaskListPage() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tasks
      </Typography>
      <EmptyState
        icon={<TaskAltIcon />}
        title="No tasks yet"
        description="Create your first task to get started with tracking care activities."
        actionLabel="Create Task"
        onAction={() => {/* TODO: Phase 2 */}}
      />
    </Box>
  );
}
