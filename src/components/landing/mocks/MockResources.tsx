import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import GroupsIcon from '@mui/icons-material/Groups';
import MockDevice from '../MockDevice';

const resources = [
  { title: 'Memory Care Day Program', type: 'Local', icon: <PlaceIcon sx={{ fontSize: '0.7rem' }} />, color: '#2E7D32', detail: '123 Oak St — (555) 234-5678' },
  { title: "Alzheimer's Association", type: 'Online', icon: <LanguageIcon sx={{ fontSize: '0.7rem' }} />, color: '#1565C0', detail: 'alz.org/help-support' },
  { title: '24/7 Helpline', type: 'Hotline', icon: <PhoneIcon sx={{ fontSize: '0.7rem' }} />, color: '#D32F2F', detail: '1-800-272-3900' },
  { title: 'Tuesday Caregiver Circle', type: 'Support Group', icon: <GroupsIcon sx={{ fontSize: '0.7rem' }} />, color: '#7B1FA2', detail: 'Community Center, 7pm weekly' },
];

export default function MockResources() {
  return (
    <MockDevice title="Caregiver Resources">
      <Stack spacing={0.5}>
        {resources.map((r, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 1.5, borderLeft: 3, borderLeftColor: r.color }}>
            <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                <Box sx={{ color: r.color, display: 'flex' }}>{r.icon}</Box>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>{r.title}</Typography>
                <Chip label={r.type} size="small" sx={{ height: 16, fontSize: '0.45rem', bgcolor: r.color, color: 'white', ml: 'auto' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>{r.detail}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
