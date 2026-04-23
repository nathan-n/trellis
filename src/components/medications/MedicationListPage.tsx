import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MedicationIcon from '@mui/icons-material/MedicationOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import dayjs from 'dayjs';
import MedicationDrugInfo from './MedicationDrugInfo';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeMedications, deleteMedication, logAdministration } from '../../services/medicationService';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { Medication } from '../../types';
import MedicationCreateEditDialog from './MedicationCreateEditDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import PageHeader from '../shared/PageHeader';
import { refillChipSx, refillUrgency } from '../../utils/accentMap';

export default function MedicationListPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeMedications(
      activeCircle.id,
      (data) => { setMeds(data); setLoading(false); },
      (err) => { console.error('Meds error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const filtered = useMemo(
    () => (filter === 'active' ? meds.filter((m) => m.isActive) : meds),
    [meds, filter]
  );

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteMedication(activeCircle.id, deleteTarget.id, userProfile.uid, userProfile.displayName);
      showMessage('Medication removed', 'success');
    } catch {
      showMessage('Failed to remove medication', 'error');
    }
    setDeleteTarget(null);
  };

  const handleQuickLog = async (med: Medication) => {
    if (!activeCircle || !userProfile) return;
    try {
      await logAdministration(activeCircle.id, med.id, userProfile.uid, userProfile.displayName, {
        skipped: false,
      });
      showMessage(`${med.name} dose logged`, 'success');
    } catch {
      showMessage('Failed to log dose', 'error');
    }
  };

  const isRefillSoon = (med: Medication) => {
    if (!med.refillDate) return false;
    return dayjs(med.refillDate.toDate()).diff(dayjs(), 'day') <= 7;
  };

  // Dynamic page overline (review finding 05):
  //  "N active · M need refill"
  //  A refill is "needed" if refillDate is within 7 days (matches the
  //  existing isRefillSoon predicate).
  const activeMeds = useMemo(() => meds.filter((m) => m.isActive), [meds]);
  const refillSoonCount = useMemo(
    () => activeMeds.filter(isRefillSoon).length,
    [activeMeds]
  );
  const headerOverline = meds.length === 0
    ? 'No medications tracked'
    : refillSoonCount > 0
      ? `${activeMeds.length} active · ${refillSoonCount} need refill`
      : `${activeMeds.length} active`;

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        overline={headerOverline}
        title="Medications"
        action={role && hasMinRole(role, CircleRole.FAMILY) ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Add Medication
          </Button>
        ) : undefined}
      />

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, val) => val && setFilter(val)}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="active">Active</ToggleButton>
        <ToggleButton value="all">All</ToggleButton>
      </ToggleButtonGroup>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MedicationIcon />}
          title={meds.length === 0 ? 'No medications tracked yet' : 'No active medications'}
          description="Add medications to track dosages, schedules, and administration."
          actionLabel={meds.length === 0 ? 'Add Medication' : undefined}
          onAction={meds.length === 0 ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((med) => (
            <Card key={med.id}>
              <Box sx={{ display: 'flex' }}>
                <CardActionArea onClick={() => navigate(`/medications/${med.id}`)} sx={{ flex: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {med.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {med.dosage} — {med.frequency}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        {!med.isActive && <Chip label="Inactive" size="small" />}
                        {med.refillDate && isRefillSoon(med) && (() => {
                          // Refill chip uses clay (overdue / <3 days) or
                          // ochre (≤7 days). Replaces MUI warning amber
                          // per the accent map.
                          const daysUntil = dayjs(med.refillDate.toDate()).diff(dayjs(), 'day');
                          return (
                            <Chip
                              icon={<WarningAmberIcon />}
                              label={`Refill: ${formatDate(med.refillDate)}`}
                              size="small"
                              sx={refillChipSx(refillUrgency(daysUntil))}
                            />
                          );
                        })()}
                      </Stack>
                    </Box>
                    {med.openFda?.pharmClassEpc?.length ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {med.openFda.pharmClassEpc.slice(0, 2).map((cls, i) => (
                          <Chip
                            key={i}
                            label={cls}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20, color: 'slate.dark', borderColor: 'slate.main' }}
                          />
                        ))}
                      </Stack>
                    ) : null}
                    {med.prescribingDoctor && (
                      <Typography variant="caption" color="text.secondary">
                        Dr. {med.prescribingDoctor}
                        {med.pharmacy && ` — ${med.pharmacy}`}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, pr: 1 }}>
                  {med.isActive && (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleQuickLog(med)}
                      title="Log dose given"
                    >
                      <CheckCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                  {((role && hasMinRole(role, CircleRole.ADMIN)) || med.createdByUid === userProfile?.uid) && (
                    <IconButton size="small" sx={{ color: 'clay.main' }} onClick={() => setDeleteTarget(med)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
              {med.openFda && (
                <Box sx={{ px: 2, pb: 1 }}>
                  <MedicationDrugInfo openFda={med.openFda} />
                </Box>
              )}
            </Card>
          ))}
        </Stack>
      )}

      <MedicationCreateEditDialog open={createOpen} onClose={() => setCreateOpen(false)} existingMeds={meds.filter((m) => m.isActive)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Medication"
        message={`Remove "${deleteTarget?.name}" from tracking?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </Box>
  );
}
