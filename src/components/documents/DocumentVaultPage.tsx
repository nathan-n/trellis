import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeDocuments, removeDocument } from '../../services/documentService';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { VaultDocument } from '../../types';
import DocumentUploadDialog from './DocumentUploadDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import AddFab from '../shared/AddFab';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import DocumentThumbnail from './DocumentThumbnail';

const categoryLabels: Record<string, string> = {
  legal: 'Legal',
  insurance: 'Insurance',
  medical: 'Medical',
  identification: 'Identification',
  other: 'Other',
};

const categoryColors: Record<string, 'error' | 'primary' | 'success' | 'info' | 'default'> = {
  legal: 'error',
  insurance: 'primary',
  medical: 'success',
  identification: 'info',
  other: 'default',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentVaultPage() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultDocument | null>(null);
  const [previewTarget, setPreviewTarget] = useState<VaultDocument | null>(null);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeDocuments(
      activeCircle.id,
      (data) => { setDocs(data); setLoading(false); },
      (err) => { console.error('Documents error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const filtered = useMemo(
    () => categoryFilter === 'all' ? docs : docs.filter((d) => d.category === categoryFilter),
    [docs, categoryFilter]
  );

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await removeDocument(activeCircle.id, deleteTarget, userProfile.uid, userProfile.displayName);
      showMessage('Document removed', 'success');
    } catch {
      showMessage('Failed to remove document', 'error');
    }
    setDeleteTarget(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">Document Vault</Typography>
      </Box>

      <ToggleButtonGroup
        value={categoryFilter}
        exclusive
        onChange={(_, val) => val && setCategoryFilter(val)}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value="all">All</ToggleButton>
        {Object.entries(categoryLabels).map(([val, label]) => (
          <ToggleButton key={val} value={val}>{label}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderIcon />}
          title={docs.length === 0 ? 'No documents yet' : 'No documents in this category'}
          description="Upload important documents like POA, insurance cards, and medical records."
          actionLabel={docs.length === 0 ? 'Upload Document' : undefined}
          onAction={docs.length === 0 ? () => setUploadOpen(true) : undefined}
        />
      ) : (
        <Stack spacing={1.5} sx={{ pb: 10 }}>
          {filtered.map((document) => (
            <Card
              key={document.id}
              onClick={() => setPreviewTarget(document)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPreviewTarget(document);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Preview ${document.title}`}
              sx={{
                cursor: 'pointer',
                transition: 'box-shadow 120ms ease, transform 120ms ease',
                '&:hover': { boxShadow: 3 },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                <DocumentThumbnail document={document} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {document.title}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                    <Chip
                      label={categoryLabels[document.category] ?? document.category}
                      size="small"
                      color={categoryColors[document.category] ?? 'default'}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {document.fileName} — {formatFileSize(document.sizeBytes)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {formatDate(document.uploadedAt)} by {document.uploadedByName}
                    </Typography>
                  </Stack>
                  {document.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                      {document.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    component="a"
                    href={document.downloadURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Download ${document.title}`}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {((role && hasMinRole(role, CircleRole.ADMIN)) || document.uploadedByUid === userProfile?.uid) && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(document); }}
                      aria-label={`Delete ${document.title}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <DocumentUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Document"
        message={`Remove "${deleteTarget?.title}"? The file will be permanently deleted.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />

      <AddFab
        label="Upload Document"
        onClick={() => setUploadOpen(true)}
        visible={Boolean(role && hasMinRole(role, CircleRole.FAMILY))}
      />

      <DocumentPreviewDialog
        document={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </Box>
  );
}
