import { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, Tabs, Tab } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import dayjs, { type Dayjs } from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeCareLogsByDate } from '../../services/careLogService';
import type { CareLog } from '../../types';
import CareLogEntryForm from './CareLogEntryForm';
import CareLogTimeline from './CareLogTimeline';
import CareLogHistoryView from './CareLogHistoryView';
import LoadingSpinner from '../shared/LoadingSpinner';

type ViewMode = 'day' | 'history';

export default function CareLogPage() {
  const { activeCircle } = useCircle();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const dateStr = date.format('YYYY-MM-DD');

  useEffect(() => {
    if (!activeCircle || viewMode !== 'day') return;
    setLoading(true);
    const unsubscribe = subscribeCareLogsByDate(
      activeCircle.id,
      dateStr,
      (data) => { setLogs(data); setLoading(false); },
      (err) => { console.error('Care logs error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id, dateStr, viewMode]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Daily Care Log</Typography>
        {viewMode === 'day' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'New Entry'}
          </Button>
        )}
      </Box>

      <Tabs
        value={viewMode}
        onChange={(_, v) => setViewMode(v as ViewMode)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="day" label="Day" />
        <Tab value="history" label="All Entries" />
      </Tabs>

      {viewMode === 'day' ? (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <DatePicker
              label="Date"
              value={date}
              onChange={(v) => v && setDate(v)}
              maxDate={dayjs()}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }}
            />
            <Button size="small" onClick={() => setDate(dayjs())}>Today</Button>
            <Button size="small" onClick={() => setDate(date.subtract(1, 'day'))}>Prev</Button>
            <Button size="small" onClick={() => setDate(date.add(1, 'day'))} disabled={date.isSame(dayjs(), 'day')}>Next</Button>
          </Stack>

          {showForm && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <CareLogEntryForm date={dateStr} onCreated={() => setShowForm(false)} />
            </Box>
          )}

          {loading ? <LoadingSpinner /> : <CareLogTimeline logs={logs} />}
        </>
      ) : (
        <CareLogHistoryView />
      )}
    </Box>
  );
}
