import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/SendOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { addComment, subscribeComments } from '../../services/taskService';
import { formatDateTime } from '../../utils/dateUtils';
import type { TaskComment } from '../../types';

interface TaskCommentsProps {
  taskId: string;
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeComments(
      activeCircle.id,
      taskId,
      setComments,
      (err) => console.error('Comments error:', err)
    );
    return unsubscribe;
  }, [activeCircle?.id, taskId]);

  const handleSend = async () => {
    if (!newComment.trim() || !activeCircle || !userProfile) return;
    setSending(true);
    try {
      await addComment(activeCircle.id, taskId, userProfile.uid, userProfile.displayName, newComment.trim());
      setNewComment('');
    } catch {
      showMessage('Failed to post comment', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Comments ({comments.length})
      </Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        {comments.map((comment) => (
          <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
              {comment.authorName?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="body2" fontWeight={600}>
                  {comment.authorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(comment.createdAt)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {comment.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          placeholder="Add a comment..."
          size="small"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          fullWidth
          multiline
          maxRows={4}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSend}
          disabled={!newComment.trim() || sending}
          sx={{ minWidth: 40, px: 1 }}
        >
          <SendIcon fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
}
