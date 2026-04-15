import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, Stack, ToggleButtonGroup, ToggleButton,
  Popover, MenuList, MenuItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Calendar, dayjsLocalizer, type Event, type SlotInfo } from 'react-big-calendar';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeVisits, deleteVisit, createVisit, toggleVisitStatus } from '../../services/visitService';
import { useAuth } from '../../contexts/AuthContext';
import { VisitStatus } from '../../constants';
import { formatTime } from '../../utils/dateUtils';
import type { Visit } from '../../types';
import VisitCreateEditDialog from './VisitCreateEditDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import LoadingSpinner from '../shared/LoadingSpinner';

dayjs.extend(isSameOrAfter);

const localizer = dayjsLocalizer(dayjs);
const VIEW_MODE_KEY = 'trellis_visit_view_mode';
type ViewMode = 'monthly' | 'coverage';

const caregiverColors = [
  '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f', '#f57c00',
  '#0097a7', '#5d4037', '#455a64', '#c2185b', '#00796b',
];

function normalizeStatus(status: string): string {
  if (status === 'scheduled' || status === 'completed') return 'confirmed';
  return status;
}

interface VisitEvent extends Event {
  visitId: string;
  visit: Visit;
  color: string;
}

export default function VisitCalendarPage() {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);
  const [createDefaultEndDate, setCreateDefaultEndDate] = useState<Date | null>(null);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Visit | null>(null);
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'monthly'
  );

  // Popover state for click-on-event menu
  const [menuAnchorPos, setMenuAnchorPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedVisitForMenu, setSelectedVisitForMenu] = useState<Visit | null>(null);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeVisits(
      activeCircle.id,
      (data) => { setVisits(data); setLoading(false); },
      (err) => { console.error('Visits error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const handleViewModeChange = (_: unknown, val: ViewMode | null) => {
    if (!val) return;
    setViewMode(val);
    localStorage.setItem(VIEW_MODE_KEY, val);
  };

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    const uids = [...new Set(visits.map((v) => v.caregiverUid))];
    uids.forEach((uid, i) => map.set(uid, caregiverColors[i % caregiverColors.length]));
    return map;
  }, [visits]);

  // Filter out old cancelled visits
  const activeVisits = useMemo(
    () => visits.filter((v) => normalizeStatus(v.status) !== 'cancelled'),
    [visits]
  );

  const events: VisitEvent[] = useMemo(
    () =>
      activeVisits.map((v) => {
        const isAllDay = v.isAllDay ?? false;
        const isCoverage = viewMode === 'coverage';
        return {
          visitId: v.id,
          visit: v,
          title: isCoverage && !isAllDay
            ? `${v.caregiverName} (${formatTime(v.startTime)} - ${formatTime(v.endTime)})`
            : v.caregiverName,
          start: v.startTime.toDate(),
          end: v.endTime.toDate(),
          allDay: isAllDay,
          color: colorMap.get(v.caregiverUid) ?? '#666',
        };
      }),
    [activeVisits, colorMap, viewMode]
  );

  const eventStyleGetter = useCallback(
    (event: VisitEvent) => {
      const isTentative = normalizeStatus(event.visit.status) === 'tentative';
      return {
        style: {
          backgroundColor: isTentative ? `${event.color}25` : event.color,
          borderRadius: '4px',
          color: isTentative ? event.color : '#fff',
          border: isTentative ? `2px dashed ${event.color}` : 'none',
          opacity: isTentative ? 0.9 : 1,
          fontWeight: 500,
        },
      };
    },
    []
  );

  // Click on event: show popover menu
  const handleSelectEvent = useCallback((event: VisitEvent, e: React.SyntheticEvent) => {
    const nativeEvent = e.nativeEvent as MouseEvent;
    setMenuAnchorPos({ top: nativeEvent.clientY, left: nativeEvent.clientX });
    setSelectedVisitForMenu(event.visit);
  }, []);

  const closeMenu = () => {
    setMenuAnchorPos(null);
    setSelectedVisitForMenu(null);
  };

  // Drag-to-select or single click
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (viewMode === 'monthly') {
      const isDrag = slotInfo.action === 'select';
      if (isDrag) {
        // Multi-day drag: open dialog with range
        setCreateDefaultDate(slotInfo.start);
        setCreateDefaultEndDate(slotInfo.end);
        setCreateOpen(true);
      } else {
        // Single click: quick-add
        quickAddVisit(slotInfo.start);
      }
    } else {
      setCreateDefaultDate(slotInfo.start);
      setCreateDefaultEndDate(null);
      setCreateOpen(true);
    }
  }, [viewMode, activeCircle, userProfile]);

  const quickAddVisit = async (clickDate: Date) => {
    if (!activeCircle || !userProfile) return;
    const startOfDay = dayjs(clickDate).startOf('day').toDate();
    const endOfDay = dayjs(clickDate).add(1, 'day').startOf('day').toDate();
    try {
      await createVisit(activeCircle.id, userProfile.uid, userProfile.displayName, {
        caregiverUid: userProfile.uid,
        caregiverName: userProfile.displayName,
        startTime: startOfDay,
        endTime: endOfDay,
        notes: null,
        status: VisitStatus.CONFIRMED,
        isAllDay: true,
      });
      showMessage('Visit added — click to edit', 'success');
    } catch {
      showMessage('Failed to add visit', 'error');
    }
  };

  const handleCreateOpen = () => {
    setCreateDefaultDate(null);
    setCreateDefaultEndDate(null);
    setCreateOpen(true);
  };

  const handleCreateClose = () => {
    setCreateOpen(false);
    setCreateDefaultDate(null);
    setCreateDefaultEndDate(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteVisit(activeCircle.id, deleteTarget.id, userProfile.uid, userProfile.displayName);
      showMessage('Visit deleted', 'success');
    } catch {
      showMessage('Failed to delete visit', 'error');
    }
    setDeleteTarget(null);
  };

  const handleToggleStatus = async () => {
    if (!selectedVisitForMenu || !activeCircle || !userProfile) return;
    try {
      await toggleVisitStatus(
        activeCircle.id,
        selectedVisitForMenu.id,
        normalizeStatus(selectedVisitForMenu.status),
        userProfile.uid,
        userProfile.displayName
      );
      const newStatus = normalizeStatus(selectedVisitForMenu.status) === 'confirmed' ? 'tentative' : 'confirmed';
      showMessage(`Visit marked as ${newStatus}`, 'success');
    } catch {
      showMessage('Failed to update status', 'error');
    }
    closeMenu();
  };

  // Coverage gap detection — handles multi-day visits
  const coverageGaps = useMemo(() => {
    if (viewMode !== 'coverage') return [];
    const gaps: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = dayjs().add(i, 'day');
      const hasVisit = activeVisits.some((v) => {
        const vStart = dayjs(v.startTime.toDate());
        const vEnd = dayjs(v.endTime.toDate());
        return day.isSameOrAfter(vStart, 'day') && day.isBefore(vEnd, 'day');
      });
      if (!hasVisit) gaps.push(day.format('ddd, MMM D'));
    }
    return gaps;
  }, [activeVisits, viewMode]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">Visit Schedule</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
            <ToggleButton value="monthly">
              <CalendarMonthIcon fontSize="small" sx={{ mr: 0.5 }} /> Monthly
            </ToggleButton>
            <ToggleButton value="coverage">
              <ScheduleIcon fontSize="small" sx={{ mr: 0.5 }} /> Coverage
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateOpen}>
            Schedule Visit
          </Button>
        </Box>
      </Box>

      {viewMode === 'monthly' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click a day to quick-add a visit. Drag across days to schedule a multi-day visit.
        </Typography>
      )}

      {coverageGaps.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Coverage gaps in the next 7 days
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {coverageGaps.map((day) => (
                <Chip key={day} label={day} size="small" color="warning" variant="outlined" />
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      <Box sx={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {viewMode === 'monthly' ? (
          <Calendar<VisitEvent>
            localizer={localizer}
            events={events}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month']}
            defaultView="month"
            popup
          />
        ) : (
          <Calendar<VisitEvent>
            localizer={localizer}
            events={events}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            defaultView="week"
            popup
          />
        )}
      </Box>

      {/* Caregiver color legend */}
      {colorMap.size > 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5, px: 0.5 }}>
          {Array.from(colorMap.entries()).map(([uid, color]) => {
            const name = activeVisits.find((v) => v.caregiverUid === uid)?.caregiverName ?? uid;
            return (
              <Box key={uid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="caption" color="text.secondary">{name}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Event popover menu */}
      <Popover
        open={Boolean(menuAnchorPos)}
        anchorReference="anchorPosition"
        anchorPosition={menuAnchorPos ?? undefined}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {selectedVisitForMenu && (
          <MenuList dense>
            <MenuItem disabled>
              <Typography variant="caption" fontWeight={600}>
                {selectedVisitForMenu.caregiverName}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setEditVisit(selectedVisitForMenu); closeMenu(); }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleToggleStatus}>
              <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
              <ListItemText>
                {normalizeStatus(selectedVisitForMenu.status) === 'confirmed' ? 'Mark Tentative' : 'Mark Confirmed'}
              </ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setDeleteTarget(selectedVisitForMenu); closeMenu(); }} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </MenuList>
        )}
      </Popover>

      <VisitCreateEditDialog
        open={createOpen}
        onClose={handleCreateClose}
        defaultDate={createDefaultDate}
        defaultEndDate={createDefaultEndDate}
        viewMode={viewMode}
      />
      <VisitCreateEditDialog
        open={Boolean(editVisit)}
        onClose={() => setEditVisit(null)}
        visit={editVisit}
        viewMode={viewMode}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Visit"
        message="Are you sure you want to delete this visit?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </Box>
  );
}
