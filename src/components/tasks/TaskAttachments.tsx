import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFileOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { addAttachment, removeAttachment, subscribeAttachments } from '../../services/taskService';
import { formatDateTime } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { TaskAttachment } from '../../types';

interface TaskAttachmentsProps {
  taskId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeAttachments(
      activeCircle.id,
      taskId,
      setAttachments,
      (err) => console.error('Attachments error:', err)
    );
    return unsubscribe;
  }, [activeCircle?.id, taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !activeCircle || !userProfile) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await addAttachment(activeCircle.id, taskId, userProfile.uid, file);
      }
      showMessage('File(s) uploaded', 'success');
    } catch {
      showMessage('Failed to upload file', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (attachment: TaskAttachment) => {
    if (!activeCircle) return;
    try {
      await removeAttachment(activeCircle.id, taskId, attachment);
      showMessage('Attachment removed', 'success');
    } catch {
      showMessage('Failed to remove attachment', 'error');
    }
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2">Attachments ({attachments.length})</Typography>
        <Button
          size="small"
          startIcon={uploading ? <CircularProgress size={16} /> : <AttachFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Upload
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          multiple
          hidden
        />
      </Box>

      <List dense>
        {attachments.map((att) => (
          <ListItem
            key={att.id}
            secondaryAction={
              <Box>
                <IconButton
                  size="small"
                  href={att.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  component="a"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
                {role && hasMinRole(role, CircleRole.ADMIN) && (
                  <IconButton size="small" onClick={() => handleRemove(att)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            }
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {isImage(att.fileType) ? <ImageIcon /> : <InsertDriveFileIcon />}
            </ListItemIcon>
            <ListItemText
              primary={att.fileName}
              secondary={`${formatFileSize(att.sizeBytes)} — ${formatDateTime(att.uploadedAt)}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
