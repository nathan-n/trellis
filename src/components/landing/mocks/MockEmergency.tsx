import { Box, Card, CardContent, Typography, Chip, Stack, Button } from '@mui/material';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergencyOutlined';
import MedicationIcon from '@mui/icons-material/MedicationOutlined';
import MockDevice from '../MockDevice';

// MockEmergency mirrors the live EmergencyQuickAccessPage (post-
// de-rainbow):
//   Patient card → clay bg (the single urgency surface)
//   Allergies   → clay left-border + clay tinted chips
//   Conditions  → neutral card (structure carries hierarchy)
//   Contacts    → neutral card + CallNowButton-style chunky clay button
// Review findings 04 + 11.
export default function MockEmergency() {
  return (
    <MockDevice title="Emergency info">
      {/* Patient card — clay bg signals the urgency domain */}
      <Card sx={{ mb: 1, bgcolor: 'clay.main', color: 'white' }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body1" fontWeight={700} sx={{ fontSize: '1rem' }}>
            Margaret Johnson
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>DOB: March 14, 1948</Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label="Blood Type: A+"
              sx={{ bgcolor: 'white', color: 'clay.dark', fontWeight: 700, fontSize: '0.7rem', height: 22 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Allergies — the ONLY accent card. Clay left-border + clay chips. */}
      <Card variant="outlined" sx={{ mb: 1, borderLeft: 4, borderLeftColor: 'clay.main' }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: 'clay.main' }}>
            <WarningAmberIcon sx={{ fontSize: '0.8rem' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Allergies</Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Chip
              label="Penicillin"
              size="small"
              sx={{ bgcolor: 'clay.light', color: 'clay.dark', fontSize: '0.65rem', fontWeight: 600, height: 20 }}
            />
            <Chip
              label="Sulfa drugs"
              size="small"
              sx={{ bgcolor: 'clay.light', color: 'clay.dark', fontSize: '0.65rem', fontWeight: 600, height: 20 }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Conditions — neutral card, no border accent */}
      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <HealthAndSafetyIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Conditions</Typography>
          </Box>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.3 }}>
            <Chip label="Alzheimer's" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
            <Chip label="Hypertension" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
            <Chip label="Type 2 Diabetes" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
          </Stack>
        </CardContent>
      </Card>

      {/* Current Medications — neutral card, synced from Medications page */}
      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <MedicationIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Current Medications</Typography>
          </Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
            <strong>Donepezil</strong> — 10mg (once daily)
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
            <strong>Memantine</strong> — 20mg (twice daily)
          </Typography>
        </CardContent>
      </Card>

      {/* Emergency Contacts — neutral card + CallNowButton-style chunky
          clay buttons. The phone button IS the primary action. */}
      <Card variant="outlined">
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <ContactEmergencyIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Emergency Contacts</Typography>
          </Box>
          <Stack spacing={0.75}>
            {[
              { name: 'Nathan', rel: 'Son', phone: '(555) 123-4567' },
              { name: 'Sarah', rel: 'Daughter', phone: '(555) 987-6543' },
            ].map((c) => (
              <Box key={c.name}>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, display: 'block', mb: 0.3 }}>
                  {c.name} <Typography component="span" color="text.secondary" sx={{ fontSize: '0.55rem' }}>({c.rel})</Typography>
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PhoneIcon sx={{ fontSize: '0.7rem !important' }} />}
                  sx={{
                    bgcolor: 'clay.main',
                    '&:hover': { bgcolor: 'clay.dark' },
                    color: 'white',
                    py: 0.5,
                    fontSize: '0.65rem',
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    letterSpacing: '0.02em',
                    boxShadow: 'none',
                  }}
                >
                  Call {c.phone}
                </Button>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </MockDevice>
  );
}
