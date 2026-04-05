import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DocumentCategory } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { uploadDocument } from '../../services/documentService';

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  legal: 'Legal',
  insurance: 'Insurance',
  medical: 'Medical',
  identification: 'Identification',
  other: 'Other',
};

export default function DocumentUploadDialog({ open, onClose }: DocumentUploadDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(DocumentCategory.OTHER);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      await uploadDocument(activeCircle.id, userProfile.uid, userProfile.displayName, file, {
        title: title.trim(),
        category,
        description: description.trim() || null,
      });
      showMessage('Document uploaded', 'success');
      handleClose();
    } catch (err) {
      console.error('Upload error:', err);
      showMessage('Failed to upload document', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setCategory(DocumentCategory.OTHER);
    setDescription('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Document</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Box
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: file ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: file ? 'primary.main' : 'text.secondary' }} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {file ? file.name : 'Click to select a file'}
            </Typography>
            {file && (
              <Typography variant="caption" color="text.secondary">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </Typography>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
          </Box>

          <TextField
            label="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(categoryLabels).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleUpload} variant="contained" disabled={!file || !title.trim() || saving}>
          {saving ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
