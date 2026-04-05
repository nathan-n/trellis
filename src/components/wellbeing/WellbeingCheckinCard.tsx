import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, Stack,
  Slider, FormControlLabel, Switch, TextField, Box, Chip,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import dayjs from 'dayjs';
import { SleepQuality } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createCheckin, getLastCheckin } from '../../services/wellbeingService';

const stressLabels = ['', 'Low', 'Mild', 'Moderate', 'High', 'Very High'];

export default function WellbeingCheckinCard() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [showForm, setShowForm] = useState(false);
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState<string>(SleepQuality.FAIR);
  const [overwhelmed, setOverwhelmed] = useState(false);
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
          feelingOverwhelmed: overwhelmed,
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

  if (!shouldPrompt && !showForm) return null;

  return (
    <Card sx={{ mb: 3, border: 1, borderColor: 'secondary.light' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FavoriteIcon color="secondary" />
          <Typography variant="subtitle1" fontWeight={600}>How are you doing?</Typography>
        </Box>

        {!showForm ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Taking care of yourself matters too. A quick check-in helps you stay aware of your own wellbeing.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="secondary" size="small" onClick={() => setShowForm(true)}>
                Check In
              </Button>
              <Button size="small" onClick={() => setShouldPrompt(false)}>
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
            <FormControlLabel
              control={<Switch checked={overwhelmed} onChange={(e) => setOverwhelmed(e.target.checked)} />}
              label="Feeling overwhelmed"
            />
            <TextField
              label="Anything on your mind? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="secondary" onClick={handleSubmit} disabled={saving} size="small">
                {saving ? 'Saving...' : 'Save Check-In'}
              </Button>
              <Button size="small" onClick={() => { setShowForm(false); setShouldPrompt(false); }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
