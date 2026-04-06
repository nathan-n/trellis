import { Box, Card, CardContent, Typography, Chip, Avatar, AvatarGroup, Stack } from '@mui/material';
import MockDevice from '../MockDevice';

const tasks = [
  {
    title: 'Schedule neurologist follow-up',
    desc: 'Dr. Patterson recommended 3-month follow-up',
    priority: 'high',
    priorityColor: 'warning' as const,
    category: 'Medical',
    status: 'To Do',
    avatars: ['S', 'M'],
    due: 'Apr 15',
  },
  {
    title: 'Update power of attorney documents',
    desc: 'Current POA needs to be reviewed with attorney',
    priority: 'urgent',
    priorityColor: 'error' as const,
    category: 'Legal',
    status: 'In Progress',
    avatars: ['N'],
    due: 'Apr 10',
  },
  {
    title: 'Refill prescriptions at CVS',
    desc: 'Donepezil and Memantine due for refill',
    priority: 'medium',
    priorityColor: 'info' as const,
    category: 'Medical',
    status: 'To Do',
    avatars: ['J', 'S'],
    due: 'Apr 8',
    recurring: true,
  },
];

export default function MockTaskList() {
  return (
    <MockDevice title="Tasks">
      <Stack spacing={1}>
        {tasks.map((task, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.8rem' }}>
                  {task.title}
                </Typography>
                <Chip label={task.priority} size="small" color={task.priorityColor} sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }} />
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
                      <Avatar key={j} sx={{ bgcolor: j === 0 ? 'primary.main' : j === 1 ? 'secondary.main' : 'warning.main' }}>{a}</Avatar>
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
