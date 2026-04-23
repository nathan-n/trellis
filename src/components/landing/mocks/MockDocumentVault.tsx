import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import MockDevice from '../MockDevice';
import { documentCategoryChipSx } from '../../../utils/accentMap';

// Category labels are lowercase for the accentMap helper (medical/legal/
// insurance/identification/other). Live DocumentVaultPage uses the same
// helper so mock and live paint identically: medical=rose, legal=slate,
// insurance=ochre, identification=plum.
const docs = [
  { title: 'Power of Attorney', category: 'legal', label: 'Legal', icon: <PictureAsPdfIcon sx={{ fontSize: '0.9rem' }} />, size: '1.2 MB', by: 'Nathan' },
  { title: 'Insurance Card (Front)', category: 'insurance', label: 'Insurance', icon: <DescriptionIcon sx={{ fontSize: '0.9rem' }} />, size: '340 KB', by: 'Sarah' },
  { title: 'Advance Directive', category: 'legal', label: 'Legal', icon: <PictureAsPdfIcon sx={{ fontSize: '0.9rem' }} />, size: '890 KB', by: 'Nathan' },
  { title: 'Medication List (Pharmacy)', category: 'medical', label: 'Medical', icon: <DescriptionIcon sx={{ fontSize: '0.9rem' }} />, size: '120 KB', by: 'James' },
];

export default function MockDocumentVault() {
  return (
    <MockDevice title="Document Vault">
      <Stack spacing={0.5}>
        {docs.map((d, i) => (
          <Card key={i} variant="outlined">
            <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: 'text.secondary' }}>{d.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem', display: 'block' }}>{d.title}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Chip
                    label={d.label}
                    size="small"
                    sx={{ height: 16, fontSize: '0.5rem', ...documentCategoryChipSx(d.category) }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem' }}>{d.size} — {d.by}</Typography>
                </Stack>
              </Box>
              <DownloadIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
