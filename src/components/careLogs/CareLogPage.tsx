import { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, Button, Stack, Tabs, Tab } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeCareLogsByDate, deleteCareLog } from '../../services/careLogService';
import type { CareLog } from '../../types';
import CareLogEntryForm from './CareLogEntryForm';
import CareLogTimeline from './CareLogTimeline';
import CareLogHistoryView from './CareLogHistoryView';
import LoadingSpinner from '../shared/LoadingSpinner';
import ConfirmDialog from '../shared/ConfirmDialog';

// Lazy-load Trends tab so recharts + react-calendar-heatmap only load when needed
const CareLogTrendsTab = lazy(() => import('./CareLogTrendsTab'));

type ViewMode = 'day' | 'history' | 'trends';

export default function CareLogPage() {
  const { activeCircle } = useCircle();
  const { userProfile } = useAuth();
  const { showMessage } = useSnackbar();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CareLog | null>(null);

  const dateStr = date.format('YYYY-MM-DD');

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteCareLog(
        activeCircle.id,
        deleteTarget.id,
        userProfile.uid,
        userProfile.displayName,
        deleteTarget.logDate
      );
      showMessage('Care log entry removed', 'success');
    } catch (err) {
      console.error('Delete care log error:', err);
      showMessage('Failed to remove entry', 'error');
    }
    setDeleteTarget(null);
  };

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
        <Tab value="trends" label="Trends" />
      </Tabs>

      {viewMode === 'day' && (
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

          {loading ? <LoadingSpinner /> : (
            <CareLogTimeline logs={logs} onDelete={setDeleteTarget} />
          )}
        </>
      )}

      {viewMode === 'history' && <CareLogHistoryView onDeleteRequest={setDeleteTarget} />}

      {viewMode === 'trends' && (
        <Suspense fallback={<LoadingSpinner />}>
          <CareLogTrendsTab
            onJumpToDay={(d) => {
              setDate(dayjs(d));
              setViewMode('day');
            }}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Care Log Entry"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.authorName}'s ${dayjs(deleteTarget.logTimestamp.toDate()).format('MMM D, h:mm A')} entry? This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </Box>
  );
}
