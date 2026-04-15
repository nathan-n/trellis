import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import MockDevice from '../MockDevice';

const expenses = [
  { title: 'Pharmacy — CVS', amount: '$47.80', category: 'Medical', date: 'Apr 5', by: 'Nathan' },
  { title: 'Grab bars installation', amount: '$285.00', category: 'Home Mod', date: 'Apr 2', by: 'James' },
  { title: 'Gas — round trip to parents', amount: '$32.50', category: 'Travel', date: 'Mar 30', by: 'Sarah' },
  { title: 'Home aide — 4 hours', amount: '$120.00', category: 'Prof. Care', date: 'Mar 28', by: 'Nathan' },
];

export default function MockExpenses() {
  return (
    <MockDevice title="Expenses — April 2026">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Chip label="Total: $485.30" color="primary" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
      </Box>
      <Stack spacing={0.5}>
        {expenses.map((e, i) => (
          <Card key={i} variant="outlined">
            <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>{e.title}</Typography>
                  <Chip label={e.category} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                  {e.date} — {e.by}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {e.amount}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
