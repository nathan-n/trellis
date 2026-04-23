import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MockDevice from '../MockDevice';

export default function MockEmergency() {
  return (
    <MockDevice title="Emergency Information">
      {/* Patient card — warm green */}
      <Card sx={{ mb: 1, bgcolor: '#3A7D44', color: 'white' }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="body1" fontWeight={700} sx={{ fontSize: '1rem' }}>Margaret Johnson</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>DOB: March 14, 1948</Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip label="Blood Type: A+" sx={{ bgcolor: 'white', color: '#3A7D44', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
          </Box>
        </CardContent>
      </Card>
      {/* Allergies — amber accent */}
      <Card sx={{ mb: 1, borderLeft: 3, borderLeftColor: '#F9A825' }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <WarningAmberIcon sx={{ fontSize: '0.8rem', color: '#F57F17' }} />
            <Typography variant="caption" sx={{ color: '#F57F17', fontWeight: 700, fontSize: '0.65rem' }}>Allergies</Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Chip label="Penicillin" size="small" sx={{ bgcolor: '#FFF8E1', color: '#F57F17', fontSize: '0.65rem', fontWeight: 600, height: 20 }} />
            <Chip label="Sulfa drugs" size="small" sx={{ bgcolor: '#FFF8E1', color: '#F57F17', fontSize: '0.65rem', fontWeight: 600, height: 20 }} />
          </Stack>
        </CardContent>
      </Card>
      {/* Conditions & Contacts */}
      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label="Alzheimer's" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
          <Chip label="Hypertension" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
          <Chip label="Type 2 Diabetes" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
        </Box>
        <Card variant="outlined" sx={{ borderLeft: 3, borderLeftColor: '#3A7D44' }}>
          <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem', color: '#3A7D44' }}>Emergency Contacts</Typography>
            {[
              { name: 'Nathan (Son)', phone: '(555) 123-4567' },
              { name: 'Sarah (Daughter)', phone: '(555) 987-6543' },
            ].map((c, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.6rem' }}>{c.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 'auto' }}>
                  <PhoneIcon sx={{ fontSize: '0.6rem', color: 'primary.main' }} />
                  <Typography variant="caption" color="primary" sx={{ fontSize: '0.6rem' }}>{c.phone}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Stack>
    </MockDevice>
  );
}
