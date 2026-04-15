import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MockDevice from '../MockDevice';

const meds = [
  {
    name: 'Donepezil (Aricept)',
    dosage: '10mg',
    frequency: 'Once daily, evening',
    doctor: 'Dr. Patterson',
    logs: [
      { given: true, by: 'Sarah', time: 'Today 8pm' },
      { given: true, by: 'Nathan', time: 'Yesterday 8pm' },
      { given: false, by: 'James', time: 'Apr 3 — refused' },
    ],
    refillSoon: false,
  },
  {
    name: 'Memantine (Namenda)',
    dosage: '20mg',
    frequency: 'Twice daily',
    doctor: 'Dr. Patterson',
    logs: [
      { given: true, by: 'Sarah', time: 'Today 8am' },
    ],
    refillSoon: true,
  },
];

export default function MockMedications() {
  return (
    <MockDevice title="Medications">
      <Stack spacing={1}>
        {meds.map((med, i) => (
          <Card key={i} variant="outlined">
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                    {med.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {med.dosage} — {med.frequency}
                  </Typography>
                </Box>
                {med.refillSoon && (
                  <Chip icon={<WarningAmberIcon sx={{ fontSize: '0.7rem !important' }} />} label="Refill Apr 12" size="small" color="warning" sx={{ height: 20, fontSize: '0.6rem' }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                Dr. {med.doctor}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap">
                {med.logs.map((log, j) => (
                  <Chip
                    key={j}
                    icon={log.given ? <CheckCircleIcon sx={{ fontSize: '0.7rem !important' }} /> : <CancelIcon sx={{ fontSize: '0.7rem !important' }} />}
                    label={`${log.by} ${log.time}`}
                    size="small"
                    color={log.given ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.55rem' }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
