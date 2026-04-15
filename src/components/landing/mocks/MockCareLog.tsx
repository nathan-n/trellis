import { Box, Card, CardContent, Typography, Chip, Stack, Avatar } from '@mui/material';
import MockDevice from '../MockDevice';

export default function MockCareLog() {
  return (
    <MockDevice title="Daily Care Log — Apr 6">
      <Stack spacing={1}>
        {/* Shift handoff entry */}
        <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: 'primary.main' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'primary.main' }}>S</Avatar>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Sarah</Typography>
              <Chip label="Shift Handoff" size="small" color="primary" sx={{ height: 18, fontSize: '0.55rem' }} />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.6rem' }}>2:30 PM</Typography>
            </Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 0.5 }}>
              <Chip label="Mood: Calm" size="small" color="success" sx={{ height: 18, fontSize: '0.55rem' }} />
              <Chip label="Sleep: Fair (6h)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
              <Chip label="2 meals" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 0.5 }}>
              <Chip label="repetitive questions" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
              <Chip label="garden walk" size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
              <Chip label="music" size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
            </Stack>
            <Typography variant="caption" color="primary" fontWeight={600} sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
              Handoff Summary
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
              Good morning overall. Ate well at breakfast, partial lunch. Enjoyed the garden. Mild confusion after nap but settled with music. Meds given on schedule.
            </Typography>
          </CardContent>
        </Card>
        {/* Regular entry */}
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'secondary.main' }}>N</Avatar>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Nathan</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.6rem' }}>9:15 AM</Typography>
            </Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              <Chip label="Mood: Happy" size="small" color="success" sx={{ height: 18, fontSize: '0.55rem' }} />
              <Chip label="Sleep: Good (8h)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </MockDevice>
  );
}
