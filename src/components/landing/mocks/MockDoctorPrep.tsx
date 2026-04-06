import { Box, Typography, Chip, Stack, Divider } from '@mui/material';
import MockDevice from '../MockDevice';

export default function MockDoctorPrep() {
  return (
    <MockDevice title="Doctor Visit Prep">
      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem', mb: 0.5 }}>
        Care Summary Report
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mb: 1 }}>
        Margaret Johnson — Mar 6 to Apr 6, 2026
      </Typography>
      <Divider sx={{ mb: 1 }} />

      {/* Medication summary */}
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Medication Adherence</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0.5, mt: 0.5, mb: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 600 }}>Medication</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 600, textAlign: 'center' }}>Given</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 600, textAlign: 'center' }}>Skipped</Typography>

        <Typography variant="caption" sx={{ fontSize: '0.55rem' }}>Donepezil 10mg</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', textAlign: 'center' }}>28</Typography>
        <Chip label="2" size="small" color="warning" sx={{ height: 16, fontSize: '0.5rem', mx: 'auto' }} />

        <Typography variant="caption" sx={{ fontSize: '0.55rem' }}>Memantine 20mg</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', textAlign: 'center' }}>58</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', textAlign: 'center' }}>0</Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />

      {/* Mood distribution */}
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Mood Distribution</Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, mb: 1 }}>
        <Chip label="Calm: 14" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
        <Chip label="Happy: 8" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
        <Chip label="Confused: 5" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
        <Chip label="Agitated: 3" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
      </Stack>

      {/* Behaviors */}
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Observed Behaviors</Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, mb: 1 }}>
        <Chip label="repetitive questions (12x)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
        <Chip label="sundowning (4x)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
        <Chip label="wandering (2x)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
      </Stack>

      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>Sleep</Typography>
      <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block', color: 'text.secondary' }}>
        Avg 6.2 hours/night (4 poor nights)
      </Typography>
    </MockDevice>
  );
}
