import { useState, useEffect, useMemo } from 'react';
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
import MedicationIcon from '@mui/icons-material/Medication';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import dayjs from 'dayjs';
import MedicationDrugInfo from './MedicationDrugInfo';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeMedications, deleteMedication } from '../../services/medicationService';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { Medication } from '../../types';
import MedicationCreateEditDialog from './MedicationCreateEditDialog';
import AdministrationLogDialog from './AdministrationLogDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function MedicationListPage() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const [logMed, setLogMed] = useState<Medication | null>(null);
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

  const isRefillSoon = (med: Medication) => {
    if (!med.refillDate) return false;
    return dayjs(med.refillDate.toDate()).diff(dayjs(), 'day') <= 7;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Medications</Typography>
        {role && hasMinRole(role, CircleRole.FAMILY) && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Add Medication
          </Button>
        )}
      </Box>

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
                <CardActionArea onClick={() => setLogMed(med)} sx={{ flex: 1 }}>
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
                        {isRefillSoon(med) && (
                          <Chip
                            icon={<WarningAmberIcon />}
                            label={`Refill: ${formatDate(med.refillDate)}`}
                            size="small"
                            color="warning"
                          />
                        )}
                      </Stack>
                    </Box>
                    {med.openFda?.pharmClassEpc?.length ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {med.openFda.pharmClassEpc.slice(0, 2).map((cls, i) => (
                          <Chip key={i} label={cls} size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
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
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 1 }}>
                  {role && hasMinRole(role, CircleRole.FAMILY) && (
                    <IconButton size="small" onClick={() => setEditMed(med)}>
                      <MedicationIcon fontSize="small" />
                    </IconButton>
                  )}
                  {role && hasMinRole(role, CircleRole.ADMIN) && (
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(med)}>
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
      <MedicationCreateEditDialog open={Boolean(editMed)} onClose={() => setEditMed(null)} medication={editMed} existingMeds={meds.filter((m) => m.isActive)} />
      <AdministrationLogDialog open={Boolean(logMed)} onClose={() => setLogMed(null)} medication={logMed} />
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
