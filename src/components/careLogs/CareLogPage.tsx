import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Box, Button, Stack, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeCareLogsByDate, deleteCareLog, fetchCareLogsInRange } from '../../services/careLogService';
import type { CareLog } from '../../types';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import CareLogEntryForm from './CareLogEntryForm';
import CareLogTimeline from './CareLogTimeline';
import CareLogHistoryView from './CareLogHistoryView';
import LoadingSpinner from '../shared/LoadingSpinner';
import ConfirmDialog from '../shared/ConfirmDialog';
import AddFab from '../shared/AddFab';
import PageHeader from '../shared/PageHeader';

// Lazy-load Trends tab so recharts + react-calendar-heatmap only load when needed
const CareLogTrendsTab = lazy(() => import('./CareLogTrendsTab'));

type ViewMode = 'day' | 'history' | 'trends';

export default function CareLogPage() {
  const { activeCircle, role } = useCircle();
  const { userProfile } = useAuth();
  const canCreate = Boolean(role && hasMinRole(role, CircleRole.PROFESSIONAL));
  const { showMessage } = useSnackbar();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CareLog | null>(null);
  const [editTarget, setEditTarget] = useState<CareLog | null>(null);

  const dateStr = date.format('YYYY-MM-DD');

  // Week-range fetch for the page header's dynamic overline. Independent
  // of the current tab so "N entries this week · last Xh ago" stays
  // stable regardless of which day the user is viewing.
  const [weekLogs, setWeekLogs] = useState<CareLog[]>([]);
  useEffect(() => {
    if (!activeCircle) return;
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    let cancelled = false;
    fetchCareLogsInRange(activeCircle.id, start, end)
      .then((logs) => { if (!cancelled) setWeekLogs(logs); })
      .catch(() => { /* silent — header overline degrades gracefully */ });
    return () => { cancelled = true; };
  }, [activeCircle?.id]);

  const headerOverline = useMemo(() => {
    if (weekLogs.length === 0) return 'No entries this week';
    const latest = weekLogs.reduce((acc, l) =>
      l.logTimestamp?.toMillis?.() > (acc?.logTimestamp?.toMillis?.() ?? 0) ? l : acc,
    weekLogs[0]);
    const latestAt = latest?.logTimestamp?.toDate?.();
    if (!latestAt) return `${weekLogs.length} this week`;
    // eslint-disable-next-line react-hooks/purity -- recency is snapshot-at-mount
    const diffMin = Math.floor((Date.now() - latestAt.getTime()) / 60000);
    const recency = diffMin < 60
      ? `${diffMin}m ago`
      : diffMin < 60 * 24
        ? `${Math.floor(diffMin / 60)}h ago`
        : `${Math.floor(diffMin / 60 / 24)}d ago`;
    return `${weekLogs.length} this week · last ${recency}`;
  }, [weekLogs]);

  // FAB click handler. FAB is visible on all tabs so users don't have to
  // switch to Day just to add. If they're NOT on Day, snap to Day and reset
  // the date to today — safer than silently logging for whatever date was
  // last selected on the Day tab (could be stale / not what the user intends).
  const handleAddClick = () => {
    if (viewMode !== 'day') {
      setDate(dayjs());
      setViewMode('day');
    }
    setShowForm(true);
  };

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
      <PageHeader overline={headerOverline} title="Care log" />

      <Tabs
        value={viewMode}
        onChange={(_, v) => setViewMode(v as ViewMode)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="day" label="Day" />
        <Tab value="history" label="History" />
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
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider', position: 'relative' }}>
              <IconButton
                size="small"
                aria-label="Close new-entry form"
                onClick={() => setShowForm(false)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <CareLogEntryForm date={dateStr} onCreated={() => setShowForm(false)} />
            </Box>
          )}

          {loading ? <LoadingSpinner /> : (
            <Box sx={{ pb: 10 }}>
              <CareLogTimeline
                logs={logs}
                onDelete={setDeleteTarget}
                onEdit={setEditTarget}
                showSpine
              />
            </Box>
          )}
        </>
      )}

      {viewMode === 'history' && (
        <CareLogHistoryView onDeleteRequest={setDeleteTarget} onEditRequest={setEditTarget} />
      )}

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

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Care Log Entry
          <IconButton size="small" onClick={() => setEditTarget(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editTarget && (
            <CareLogEntryForm
              date={editTarget.logDate}
              editLog={editTarget}
              onCreated={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* FAB is available on ALL tabs. Clicking from a non-Day tab snaps to
          Day and resets the date to today for predictable behavior. */}
      <AddFab
        label="New Entry"
        onClick={handleAddClick}
        visible={canCreate}
      />
    </Box>
  );
}
