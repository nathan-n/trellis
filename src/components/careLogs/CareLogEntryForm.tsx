import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Mood, SleepQuality, MealAmount } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createCareLog, updateCareLog, fetchCareLogVocabulary } from '../../services/careLogService';
import type { MealEntry, HydrationEntry, CareLog } from '../../types';
import dayjs from 'dayjs';
import ChipInput from '../shared/ChipInput';

interface CareLogEntryFormProps {
  date: string;
  onCreated: () => void;
  /** When provided, form runs in edit mode and updates the given log instead of creating a new one. */
  editLog?: CareLog;
}

const moodLabels: Record<string, string> = {
  calm: 'Calm', agitated: 'Agitated', confused: 'Confused',
  happy: 'Happy', withdrawn: 'Withdrawn', other: 'Other',
};

export default function CareLogEntryForm({ date, onCreated, editLog }: CareLogEntryFormProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editLog);

  // Seed state from editLog once at mount. No re-seeding on prop change to
  // avoid clobbering in-progress user edits.
  const [meals, setMeals] = useState<MealEntry[]>(() => editLog?.meals ?? []);
  const [hydration, setHydration] = useState<HydrationEntry[]>(() => editLog?.hydration ?? []);
  const [mood, setMood] = useState<string>(() => editLog?.mood ?? Mood.CALM);
  const [moodNotes, setMoodNotes] = useState(() => editLog?.moodNotes ?? '');
  const [sleepQuality, setSleepQuality] = useState<string>(() => editLog?.sleep?.quality ?? SleepQuality.FAIR);
  const [sleepHours, setSleepHours] = useState(() => editLog?.sleep?.hoursSlept != null ? String(editLog.sleep.hoursSlept) : '');
  const [sleepNotes, setSleepNotes] = useState(() => editLog?.sleep?.notes ?? '');
  const [behaviors, setBehaviors] = useState<string[]>(() => editLog?.behaviors ?? []);
  const [activities, setActivities] = useState<string[]>(() => editLog?.activities ?? []);
  const [behaviorSuggestions, setBehaviorSuggestions] = useState<string[]>([]);
  const [activitySuggestions, setActivitySuggestions] = useState<string[]>([]);
  const [generalNotes, setGeneralNotes] = useState(() => editLog?.generalNotes ?? '');
  const [isShiftHandoff, setIsShiftHandoff] = useState(() => editLog?.isShiftHandoff ?? false);
  const [shiftSummary, setShiftSummary] = useState(() => editLog?.shiftSummary ?? '');

  // Load the circle's recent vocabulary (last 90d) once on mount.
  useEffect(() => {
    if (!activeCircle) return;
    let cancelled = false;
    fetchCareLogVocabulary(activeCircle.id)
      .then((vocab) => {
        if (cancelled) return;
        setBehaviorSuggestions(vocab.behaviors);
        setActivitySuggestions(vocab.activities);
      })
      .catch(() => { /* suggestions are a nice-to-have, don't block the form */ });
    return () => { cancelled = true; };
  }, [activeCircle?.id]);

  const addMeal = () => setMeals([...meals, { time: dayjs().format('HH:mm'), description: '', amount: MealAmount.FULL }]);
  const addHydration = () => setHydration([...hydration, { time: dayjs().format('HH:mm'), amount: '', type: 'water' }]);

  const handleSubmit = async () => {
    if (!activeCircle || !userProfile) return;

    setSaving(true);
    const payload = {
      logDate: isEdit && editLog ? editLog.logDate : date,
      meals,
      hydration,
      mood: mood as typeof Mood[keyof typeof Mood],
      moodNotes: moodNotes.trim() || null,
      sleep: {
        quality: sleepQuality as typeof SleepQuality[keyof typeof SleepQuality],
        hoursSlept: sleepHours ? parseFloat(sleepHours) : null,
        notes: sleepNotes.trim() || null,
      },
      behaviors,
      activities,
      generalNotes: generalNotes.trim() || null,
      isShiftHandoff,
      shiftSummary: isShiftHandoff ? shiftSummary.trim() || null : null,
    };

    try {
      if (isEdit && editLog) {
        await updateCareLog(activeCircle.id, editLog.id, payload);
        showMessage('Care log entry updated', 'success');
      } else {
        await createCareLog(activeCircle.id, userProfile.uid, userProfile.displayName, payload);
        showMessage('Care log entry saved', 'success');
      }
      onCreated();
    } catch (err) {
      console.error('Care log error:', err);
      showMessage(isEdit ? 'Failed to update entry' : 'Failed to save entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle1" fontWeight={600}>
        {isEdit ? 'Edit Care Log Entry' : 'New Care Log Entry'}
      </Typography>

      {/* Mood */}
      <FormControl fullWidth size="small">
        <InputLabel>Mood</InputLabel>
        <Select value={mood} label="Mood" onChange={(e) => setMood(e.target.value)}>
          {Object.entries(moodLabels).map(([val, label]) => (
            <MenuItem key={val} value={val}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField label="Mood Notes" value={moodNotes} onChange={(e) => setMoodNotes(e.target.value)} size="small" fullWidth />

      {/* Sleep */}
      <Divider><Chip label="Sleep" size="small" /></Divider>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 100, flex: '1 1 100px' }}>
          <InputLabel>Quality</InputLabel>
          <Select value={sleepQuality} label="Quality" onChange={(e) => setSleepQuality(e.target.value)}>
            <MenuItem value={SleepQuality.GOOD}>Good</MenuItem>
            <MenuItem value={SleepQuality.FAIR}>Fair</MenuItem>
            <MenuItem value={SleepQuality.POOR}>Poor</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Hours" type="number" size="small" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} sx={{ flex: '1 1 80px', maxWidth: 120 }} />
        <TextField label="Sleep Notes" size="small" value={sleepNotes} onChange={(e) => setSleepNotes(e.target.value)} sx={{ flex: '2 1 150px' }} />
      </Box>

      {/* Meals */}
      <Divider><Chip label="Meals" size="small" /></Divider>
      {meals.map((meal, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField label="Time" size="small" value={meal.time} onChange={(e) => setMeals(meals.map((m, j) => j === i ? { ...m, time: e.target.value } : m))} sx={{ flex: '1 1 70px', maxWidth: 100 }} />
          <TextField label="Description" size="small" value={meal.description} onChange={(e) => setMeals(meals.map((m, j) => j === i ? { ...m, description: e.target.value } : m))} sx={{ flex: '3 1 150px' }} />
          <FormControl size="small" sx={{ flex: '1 1 80px', maxWidth: 110 }}>
            <Select value={meal.amount} onChange={(e) => setMeals(meals.map((m, j) => j === i ? { ...m, amount: e.target.value as MealEntry['amount'] } : m))}>
              <MenuItem value={MealAmount.FULL}>Full</MenuItem>
              <MenuItem value={MealAmount.PARTIAL}>Partial</MenuItem>
              <MenuItem value={MealAmount.REFUSED}>Refused</MenuItem>
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => setMeals(meals.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addMeal}>Add Meal</Button>

      {/* Hydration */}
      <Divider><Chip label="Hydration" size="small" /></Divider>
      {hydration.map((h, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField label="Time" size="small" value={h.time} onChange={(e) => setHydration(hydration.map((hh, j) => j === i ? { ...hh, time: e.target.value } : hh))} sx={{ flex: '1 1 70px', maxWidth: 100 }} />
          <TextField label="Amount" size="small" value={h.amount} onChange={(e) => setHydration(hydration.map((hh, j) => j === i ? { ...hh, amount: e.target.value } : hh))} sx={{ flex: '1 1 70px', maxWidth: 100 }} placeholder="8oz" />
          <TextField label="Type" size="small" value={h.type} onChange={(e) => setHydration(hydration.map((hh, j) => j === i ? { ...hh, type: e.target.value } : hh))} sx={{ flex: '2 1 120px' }} placeholder="water, juice, etc." />
          <IconButton size="small" onClick={() => setHydration(hydration.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addHydration}>Add Hydration</Button>

      {/* Behaviors & Activities */}
      <Divider><Chip label="Observations" size="small" /></Divider>
      <ChipInput
        label="Behaviors"
        placeholder="e.g. sundowning, wandering"
        values={behaviors}
        onChange={setBehaviors}
        suggestions={behaviorSuggestions}
        chipColor="warning"
      />
      <ChipInput
        label="Activities"
        placeholder="e.g. walk, music, puzzles"
        values={activities}
        onChange={setActivities}
        suggestions={activitySuggestions}
        chipColor="primary"
      />
      <TextField label="General Notes" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} fullWidth multiline rows={3} />

      {/* Shift Handoff */}
      <Divider><Chip label="Shift Handoff" size="small" /></Divider>
      <FormControlLabel control={<Switch checked={isShiftHandoff} onChange={(e) => setIsShiftHandoff(e.target.checked)} />} label="This is a shift handoff entry" />
      {isShiftHandoff && (
        <TextField label="Shift Summary for Next Caregiver" value={shiftSummary} onChange={(e) => setShiftSummary(e.target.value)} fullWidth multiline rows={3} placeholder="Key things the next caregiver should know..." />
      )}

      <Button variant="contained" onClick={handleSubmit} disabled={saving} fullWidth>
        {saving ? (isEdit ? 'Saving changes...' : 'Saving...') : (isEdit ? 'Save changes' : 'Save Entry')}
      </Button>
    </Stack>
  );
}
