import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Stack, Chip,
  IconButton, ToggleButtonGroup, ToggleButton, Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlaceIcon from '@mui/icons-material/Place';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeResources, deleteResource } from '../../services/resourceService';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { CaregiverResource } from '../../types';
import ResourceCreateEditDialog from './ResourceCreateEditDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  local: { label: 'Local', color: '#2E7D32', icon: <PlaceIcon fontSize="small" /> },
  online: { label: 'Online', color: '#1565C0', icon: <LanguageIcon fontSize="small" /> },
  hotline: { label: 'Hotline', color: '#D32F2F', icon: <PhoneIcon fontSize="small" /> },
  support_group: { label: 'Support Group', color: '#7B1FA2', icon: <GroupsIcon fontSize="small" /> },
  government: { label: 'Government', color: '#E65100', icon: <AccountBalanceIcon fontSize="small" /> },
  financial: { label: 'Financial', color: '#00695C', icon: <AttachMoneyIcon fontSize="small" /> },
};

export default function ResourceListPage() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [resources, setResources] = useState<CaregiverResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CaregiverResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CaregiverResource | null>(null);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeResources(
      activeCircle.id,
      (data) => { setResources(data); setLoading(false); },
      (err) => { console.error('Resources error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const filtered = useMemo(
    () => typeFilter === 'all' ? resources : resources.filter((r) => r.type === typeFilter),
    [resources, typeFilter]
  );

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteResource(activeCircle.id, deleteTarget, userProfile.uid, userProfile.displayName);
      showMessage('Resource removed', 'success');
    } catch {
      showMessage('Failed to remove resource', 'error');
    }
    setDeleteTarget(null);
  };

  const canEdit = role && hasMinRole(role, CircleRole.FAMILY);
  const canDelete = role && hasMinRole(role, CircleRole.ADMIN);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Caregiver Resources</Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Add Resource
          </Button>
        )}
      </Box>

      <ToggleButtonGroup
        value={typeFilter}
        exclusive
        onChange={(_, val) => val && setTypeFilter(val)}
        size="small"
        sx={{ mb: 3, flexWrap: 'wrap' }}
      >
        <ToggleButton value="all">All</ToggleButton>
        {Object.entries(typeConfig).map(([val, cfg]) => (
          <ToggleButton key={val} value={val}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
              {cfg.label}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MenuBookIcon />}
          title={resources.length === 0 ? 'No resources yet' : 'No resources of this type'}
          description="Add helpful resources like local services, support groups, hotlines, and online guides for your care circle."
          actionLabel={resources.length === 0 && canEdit ? 'Add Resource' : undefined}
          onAction={resources.length === 0 && canEdit ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((resource) => {
            const cfg = typeConfig[resource.type] ?? { label: resource.type, color: '#666', icon: <MenuBookIcon fontSize="small" /> };
            return (
              <Card
                key={resource.id}
                sx={{
                  borderLeft: 4,
                  borderLeftColor: cfg.color,
                }}
              >
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Title row with type icon */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {resource.title}
                        </Typography>
                        <Chip
                          label={cfg.label}
                          size="small"
                          sx={{
                            bgcolor: cfg.color,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 22,
                          }}
                        />
                      </Box>

                      {/* Description */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {resource.description}
                      </Typography>

                      {/* Contact info chips */}
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {resource.url && (
                          <Chip
                            icon={<OpenInNewIcon sx={{ fontSize: '0.8rem !important' }} />}
                            label={
                              <Link
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}
                              >
                                Visit Website
                              </Link>
                            }
                            size="small"
                            variant="outlined"
                            sx={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            onClick={() => window.open(resource.url!, '_blank', 'noopener,noreferrer')}
                          />
                        )}
                        {resource.phone && (
                          <Chip
                            icon={<PhoneIcon sx={{ fontSize: '0.8rem !important' }} />}
                            label={
                              <Link href={`tel:${resource.phone}`} sx={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>
                                {resource.phone}
                              </Link>
                            }
                            size="small"
                            variant="outlined"
                            sx={{ pointerEvents: 'auto' }}
                          />
                        )}
                        {resource.address && (
                          <Chip
                            icon={<PlaceIcon sx={{ fontSize: '0.8rem !important' }} />}
                            label={resource.address}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {resource.contactName && (
                          <Typography variant="caption" color="text.secondary">
                            Contact: {resource.contactName}
                          </Typography>
                        )}
                      </Stack>

                      {/* Notes */}
                      {resource.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {resource.notes}
                        </Typography>
                      )}

                      {/* Metadata */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Added by {resource.addedByName} on {formatDate(resource.createdAt)}
                      </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                      {canEdit && (
                        <IconButton size="small" onClick={() => setEditTarget(resource)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(canDelete || resource.addedByUid === userProfile?.uid) && (
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(resource)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <ResourceCreateEditDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ResourceCreateEditDialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} editResource={editTarget} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Resource"
        message={`Remove "${deleteTarget?.title}"?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </Box>
  );
}
