import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MockDevice from '../MockDevice';
import { accentChipSx } from '../../../utils/accentMap';

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
                  // Ochre refill chip — matches the accent map for
                  // upcoming/scheduled refills in the live app.
                  <Chip icon={<WarningAmberIcon sx={{ fontSize: '0.7rem !important' }} />} label="Refill Apr 12" size="small" sx={{ height: 20, fontSize: '0.6rem', ...accentChipSx('ochre') }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                Dr. {med.doctor}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap">
                {med.logs.map((log, j) => (
                  // Given = green (confirmed/done), skipped = slate
                  // (categorical log state). Matches the accent map used
                  // in AdministrationLogDialog / MedicationDetailPage.
                  <Chip
                    key={j}
                    icon={log.given ? <CheckCircleIcon sx={{ fontSize: '0.7rem !important' }} /> : <CancelIcon sx={{ fontSize: '0.7rem !important' }} />}
                    label={`${log.by} ${log.time}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.55rem',
                      color: log.given ? 'primary.dark' : 'slate.dark',
                      borderColor: log.given ? 'primary.main' : 'slate.main',
                    }}
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
