import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import MockDevice from '../MockDevice';

const docs = [
  { title: 'Power of Attorney', category: 'Legal', icon: <PictureAsPdfIcon sx={{ fontSize: '0.9rem' }} />, size: '1.2 MB', by: 'Nathan' },
  { title: 'Insurance Card (Front)', category: 'Insurance', icon: <DescriptionIcon sx={{ fontSize: '0.9rem' }} />, size: '340 KB', by: 'Sarah' },
  { title: 'Advance Directive', category: 'Legal', icon: <PictureAsPdfIcon sx={{ fontSize: '0.9rem' }} />, size: '890 KB', by: 'Nathan' },
  { title: 'Medication List (Pharmacy)', category: 'Medical', icon: <DescriptionIcon sx={{ fontSize: '0.9rem' }} />, size: '120 KB', by: 'James' },
];

const categoryColors: Record<string, 'error' | 'primary' | 'success'> = {
  Legal: 'error', Insurance: 'primary', Medical: 'success',
};

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
                  <Chip label={d.category} size="small" color={categoryColors[d.category] ?? 'default'} variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
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
