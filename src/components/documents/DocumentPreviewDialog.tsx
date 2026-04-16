import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { VaultDocument } from '../../types';
import { getPreviewKind, type PreviewKind } from '../../utils/documentPreview';

interface Props {
  document: VaultDocument | null;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fetches text content and renders it in a scrollable <pre>. Silent-fails
// to the unsupported fallback on error so users still get a Download CTA.
function TextPreview({ url, onError }: { url: string; onError: () => void }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((content) => {
        if (!cancelled) setText(content);
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => { cancelled = true; };
  }, [url, onError]);

  if (text == null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  return (
    <Box
      component="pre"
      sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: '"SF Mono", Menlo, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.5,
        bgcolor: 'background.default',
        p: 2,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        m: 0,
      }}
    >
      {text}
    </Box>
  );
}

function UnsupportedFallback({ fileName, fileType }: { fileName: string; fileType: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <InsertDriveFileIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5 }} />
      <Typography variant="subtitle1" fontWeight={600}>
        Preview not available
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 0.5 }}>
        This file type ({fileType || 'unknown'}) can't be previewed inline.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Download it to open in the appropriate app.
      </Typography>
      <Chip label={fileName} variant="outlined" size="small" sx={{ mt: 2 }} />
    </Box>
  );
}

export default function DocumentPreviewDialog({ document, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  // Track text-fetch failures so we can fall back gracefully mid-render.
  const [textFetchFailed, setTextFetchFailed] = useState(false);

  // Reset the fetch-failed flag when a new document opens.
  useEffect(() => {
    setTextFetchFailed(false);
  }, [document?.id]);

  if (!document) return null;

  const kind: PreviewKind = textFetchFailed ? 'unsupported' : getPreviewKind(document.fileType);

  return (
    <Dialog
      open={Boolean(document)}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      aria-labelledby="document-preview-title"
    >
      <DialogTitle
        id="document-preview-title"
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pr: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {document.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {document.fileName} · {formatFileSize(document.sizeBytes)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close preview">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'grey.100', minHeight: 320 }}>
        {kind === 'image' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src={document.downloadURL}
              alt={document.title}
              style={{ maxWidth: '100%', maxHeight: fullScreen ? '70vh' : '75vh', objectFit: 'contain' }}
            />
          </Box>
        )}

        {kind === 'pdf' && (
          <iframe
            src={document.downloadURL}
            title={document.title}
            style={{
              width: '100%',
              height: fullScreen ? '75vh' : '75vh',
              minHeight: 400,
              border: 0,
              background: 'white',
            }}
          />
        )}

        {kind === 'text' && (
          <TextPreview url={document.downloadURL} onError={() => setTextFetchFailed(true)} />
        )}

        {kind === 'unsupported' && (
          <UnsupportedFallback fileName={document.fileName} fileType={document.fileType} />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          component="a"
          href={document.downloadURL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
