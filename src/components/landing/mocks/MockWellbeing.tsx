import { Box, Card, CardContent, Typography, Chip, Stack, Slider } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MockDevice from '../MockDevice';
import { accentChipSx, type AccentKind } from '../../../utils/accentMap';

// Stress level → Direction C accent. Matches WellbeingHistoryPage.
const stressAccent: Record<string, AccentKind> = {
  Low: 'green',
  Moderate: 'ochre',
  High: 'clay',
};

export default function MockWellbeing() {
  return (
    <MockDevice title="My Wellbeing">
      {/* Check-in card */}
      <Card sx={{ mb: 1.5, border: 1, borderColor: 'secondary.light' }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <FavoriteIcon sx={{ color: 'secondary.main', fontSize: '1rem' }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>How are you doing?</Typography>
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
              Stress Level: <Chip label="Moderate" size="small" sx={{ height: 16, fontSize: '0.5rem' }} />
            </Typography>
            <Slider
              value={3}
              min={1} max={5} step={1}
              size="small"
              color="secondary"
              sx={{ mt: 0, mb: 0, py: 0.5 }}
              marks={[{ value: 1, label: '1' }, { value: 5, label: '5' }]}
            />
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Chip label="Sleep: Fair" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
          </Stack>
        </CardContent>
      </Card>
      {/* History */}
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
        Recent Check-ins
      </Typography>
      <Stack spacing={0.5}>
        {[
          { date: 'Apr 6', stress: 'Moderate', sleep: 'Fair' },
          { date: 'Mar 30', stress: 'Low', sleep: 'Good' },
          { date: 'Mar 23', stress: 'High', sleep: 'Poor', overwhelmed: true },
        ].map((c, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 1 }}>
            <CardContent sx={{ py: 0.5, px: 1.5, '&:last-child': { pb: 0.5 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>{c.date}</Typography>
              <Stack direction="row" spacing={0.3}>
                <Chip label={c.stress} size="small" sx={{ height: 16, fontSize: '0.5rem', ...accentChipSx(stressAccent[c.stress] ?? 'slate') }} />
                <Chip label={c.sleep} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.5rem' }} />
                {c.overwhelmed && (
                  // Rose (wellbeing/body tone) — matches the live
                  // WellbeingHistoryPage overwhelmed chip.
                  <Chip label="Overwhelmed" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.5rem', color: 'rose.dark', borderColor: 'rose.main' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </MockDevice>
  );
}
