import { Box, Card, CardContent, Typography, Chip, Avatar, AvatarGroup, Stack } from '@mui/material';
import MockDevice from '../MockDevice';
import { priorityChipSx } from '../../../utils/accentMap';

// Mirrors the live TaskListPage:
//   - Tasks sorted by due date ascending (review fix 10)
//   - Priority chips → accent map (urgent=clay, high=ochre, medium=slate)
//   - Plum left-rule on "new to me" tasks (review fix 09) — single
//     unseen signal shared with MyNextPriorityCard.
//   - Avatars use brand palette (primary/secondary/clay), not MUI
//     success/warning.
const tasks = [
  {
    title: 'Refill prescriptions at CVS',
    desc: 'Donepezil and Memantine due for refill',
    priority: 'medium',
    category: 'Medical',
    status: 'To Do',
    avatars: [{ letter: 'J', color: 'primary.main' }, { letter: 'S', color: 'secondary.main' }],
    due: 'Apr 8',
    recurring: true,
    unseen: false,
  },
  {
    title: 'Update power of attorney documents',
    desc: 'Current POA needs to be reviewed with attorney',
    priority: 'urgent',
    category: 'Legal',
    status: 'In Progress',
    avatars: [{ letter: 'N', color: 'primary.main' }],
    due: 'Apr 10',
    recurring: false,
    unseen: true, // simulate "new to me"
  },
  {
    title: 'Schedule neurologist follow-up',
    desc: 'Dr. Patterson recommended 3-month follow-up',
    priority: 'high',
    category: 'Medical',
    status: 'To Do',
    avatars: [{ letter: 'S', color: 'secondary.main' }, { letter: 'M', color: 'clay.main' }],
    due: 'Apr 15',
    recurring: false,
    unseen: false,
  },
];

export default function MockTaskList() {
  return (
    <MockDevice title="Tasks">
      <Stack spacing={1}>
        {tasks.map((task, i) => (
          <Card
            key={i}
            variant="outlined"
            sx={task.unseen ? { borderLeft: 3, borderLeftColor: 'secondary.main' } : undefined}
          >
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.8rem' }}>
                  {task.title}
                </Typography>
                <Chip
                  label={task.priority}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize', ...priorityChipSx(task.priority) }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.7rem' }}>
                {task.desc}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Chip label={task.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                <Chip label={task.status} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                {task.recurring && (
                  <Chip label="Weekly" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Due: {task.due}
                </Typography>
                <Box sx={{ ml: 'auto' }}>
                  <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 18, height: 18, fontSize: '0.55rem' } }}>
                    {task.avatars.map((a, j) => (
                      <Avatar key={j} sx={{ bgcolor: a.color }}>{a.letter}</Avatar>
                    ))}
                  </AvatarGroup>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
