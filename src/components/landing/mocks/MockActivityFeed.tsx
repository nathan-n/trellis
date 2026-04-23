import { Box, Card, CardContent, Typography, Avatar, Stack, Chip } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import EventIcon from '@mui/icons-material/EventOutlined';
import MedicationIcon from '@mui/icons-material/MedicationOutlined';
import NoteAltIcon from '@mui/icons-material/NoteAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import MockDevice from '../MockDevice';

const entries = [
  { icon: <CheckCircleIcon sx={{ fontSize: '0.7rem' }} />, color: '#388e3c', actor: 'Sarah', action: 'completed task "Refill prescriptions"', time: '2h ago', type: 'task' },
  { icon: <MedicationIcon sx={{ fontSize: '0.7rem' }} />, color: '#0097a7', actor: 'Nathan', action: 'logged Donepezil dose — given', time: '3h ago', type: 'medication' },
  { icon: <NoteAltIcon sx={{ fontSize: '0.7rem' }} />, color: '#f57c00', actor: 'Sarah', action: 'logged a care entry for Apr 6', time: '4h ago', type: 'careLog' },
  { icon: <EventIcon sx={{ fontSize: '0.7rem' }} />, color: '#7b1fa2', actor: 'James', action: 'scheduled a visit for Apr 12', time: '6h ago', type: 'visit' },
  { icon: <TaskAltIcon sx={{ fontSize: '0.7rem' }} />, color: '#2e7d32', actor: 'Nathan', action: 'created task "Call insurance about claim"', time: '1d ago', type: 'task' },
];

export default function MockActivityFeed() {
  return (
    <MockDevice title="Activity">
      <Stack spacing={0.5}>
        {entries.map((e, i) => (
          <Card key={i} variant="outlined">
            <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: e.color }}>
                {e.icon}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                  <strong>{e.actor}</strong> {e.action}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.55rem' }}>
                  {e.time}
                </Typography>
              </Box>
              <Chip label={e.type} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.5rem', display: { xs: 'none', sm: 'flex' } }} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
