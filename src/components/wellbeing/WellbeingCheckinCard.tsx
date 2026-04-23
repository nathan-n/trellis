import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, Stack,
  Slider, TextField, Box, Chip,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import dayjs from 'dayjs';
import { SleepQuality } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createCheckin, getLastCheckin } from '../../services/wellbeingService';
import type { OverwhelmLevel } from '../../types/wellbeing';

const stressLabels = ['', 'Low', 'Mild', 'Moderate', 'High', 'Very High'];

const OVERWHELM_OPTIONS: { value: OverwhelmLevel; label: string }[] = [
  { value: 'not_really', label: 'Not really' },
  { value: 'a_little', label: 'A little' },
  { value: 'quite_a_bit', label: 'Quite a bit' },
];

export default function WellbeingCheckinCard() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [showForm, setShowForm] = useState(false);
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState<string>(SleepQuality.FAIR);
  // Review finding 07: switch ("Feeling overwhelmed: on/off") replaced
  // with a 3-state chip group. Defaults to 'not_really' so the absence
  // of input reads as "not setting this off" rather than an implicit
  // binary assertion.
  const [overwhelmLevel, setOverwhelmLevel] = useState<OverwhelmLevel>('not_really');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function checkLastCheckin() {
      if (!activeCircle || !userProfile) return;
      try {
        const last = await getLastCheckin(activeCircle.id, userProfile.uid);
        if (!last) {
          setShouldPrompt(true);
        } else {
          const daysSince = dayjs().diff(dayjs(last.date), 'day');
          setShouldPrompt(daysSince >= 7);
        }
      } catch {
        // Silently fail — don't block the priority view
      }
    }
    checkLastCheckin();
  }, [activeCircle?.id, userProfile?.uid]);

  const handleSubmit = async () => {
    if (!activeCircle || !userProfile) return;
    setSaving(true);
    try {
      await createCheckin(
        activeCircle.id,
        userProfile.uid,
        userProfile.displayName,
        dayjs().format('YYYY-MM-DD'),
        {
          stressLevel,
          sleepQuality: sleepQuality as SleepQuality,
          // Map the 3-state to the legacy boolean for backward-compat
          // readers (WellbeingHistoryPage "Overwhelmed" chip, sparkline).
          feelingOverwhelmed: overwhelmLevel === 'quite_a_bit',
          overwhelmLevel,
          notes: notes.trim() || null,
        }
      );
      showMessage('Check-in saved — thank you for taking a moment', 'success');
      setShowForm(false);
      setShouldPrompt(false);
    } catch {
      showMessage('Failed to save check-in', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Always show something — prominent card for weekly nudge, subtle link otherwise
  if (!shouldPrompt && !showForm) {
    return (
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          color="secondary"
          startIcon={<FavoriteIcon sx={{ fontSize: '0.9rem' }} />}
          onClick={() => setShowForm(true)}
          sx={{ textTransform: 'none', fontSize: '0.8rem' }}
        >
          How are you doing? Check in
        </Button>
      </Box>
    );
  }

  // Prompt shape: rose-tint paper when shouldPrompt && !showForm;
  // neutral paper once the user engages the form.
  const isPromptState = shouldPrompt && !showForm;

  return (
    <Card
      sx={{
        mb: 3,
        // Review finding 07: warmer weekly prompt — rose paper tint (not
        // a plain bordered card) so the nudge reads as gentle invitation,
        // not generic alert. Matches the wellbeing domain accent.
        bgcolor: isPromptState ? 'rose.light' : 'background.paper',
        border: 1,
        borderColor: isPromptState ? 'rose.main' : 'secondary.light',
        transition: 'background-color 200ms',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FavoriteIcon sx={{ color: isPromptState ? 'rose.dark' : 'secondary.main' }} />
          <Typography variant="subtitle1" fontWeight={600}>How are you doing?</Typography>
        </Box>

        {!showForm ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Taking care of yourself matters too. A quick check-in helps you stay aware of your own wellbeing.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowForm(true)}
                sx={{ bgcolor: 'rose.main', '&:hover': { bgcolor: 'rose.dark' }, color: 'white' }}
              >
                Check In
              </Button>
              <Button size="small" onClick={() => setShouldPrompt(false)} sx={{ color: 'text.secondary' }}>
                Not Now
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Stress Level: <Chip label={stressLabels[stressLevel]} size="small" color={stressLevel >= 4 ? 'error' : 'default'} />
              </Typography>
              <Slider
                value={stressLevel}
                onChange={(_, v) => setStressLevel(v as number)}
                min={1} max={5} step={1}
                marks={[{ value: 1, label: '1' }, { value: 3, label: '3' }, { value: 5, label: '5' }]}
              />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Your Sleep Quality</InputLabel>
              <Select value={sleepQuality} label="Your Sleep Quality" onChange={(e) => setSleepQuality(e.target.value)}>
                <MenuItem value={SleepQuality.GOOD}>Good</MenuItem>
                <MenuItem value={SleepQuality.FAIR}>Fair</MenuItem>
                <MenuItem value={SleepQuality.POOR}>Poor</MenuItem>
              </Select>
            </FormControl>
            {/* Overwhelm: 3-state chip group. Selected chip solid rose
                (wellbeing domain); unselected light rose tint. Gentler
                than the previous clinical yes/no switch. */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Feeling overwhelmed?
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.75 }}>
                {OVERWHELM_OPTIONS.map((opt) => {
                  const selected = overwhelmLevel === opt.value;
                  return (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      onClick={() => setOverwhelmLevel(opt.value)}
                      sx={{
                        fontWeight: 500,
                        bgcolor: selected ? 'rose.main' : 'rose.light',
                        color: selected ? 'white' : 'rose.dark',
                        '&:hover': {
                          bgcolor: selected ? 'rose.dark' : 'rose.light',
                        },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
            <TextField
              label="Anything on your mind? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                size="small"
                sx={{ bgcolor: 'rose.main', '&:hover': { bgcolor: 'rose.dark' }, color: 'white' }}
              >
                {saving ? 'Saving...' : 'Save Check-In'}
              </Button>
              <Button size="small" onClick={() => { setShowForm(false); setShouldPrompt(false); }} sx={{ color: 'text.secondary' }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
