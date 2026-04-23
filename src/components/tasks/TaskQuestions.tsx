import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Stack, Checkbox,
  IconButton, Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  addQuestion, updateQuestion, deleteQuestion, subscribeQuestions,
} from '../../services/questionService';
import { formatDateTime } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { DoctorQuestion } from '../../types';

interface TaskQuestionsProps {
  taskId: string;
}

export default function TaskQuestions({ taskId }: TaskQuestionsProps) {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [questions, setQuestions] = useState<DoctorQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeQuestions(
      activeCircle.id,
      taskId,
      setQuestions,
      (err) => console.error('Questions error:', err)
    );
    return unsubscribe;
  }, [activeCircle?.id, taskId]);

  const handleAdd = async () => {
    if (!newQuestion.trim() || !activeCircle || !userProfile) return;
    setAdding(true);
    try {
      await addQuestion(activeCircle.id, taskId, userProfile.uid, userProfile.displayName, newQuestion.trim());
      setNewQuestion('');
    } catch {
      showMessage('Failed to add question', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleAnswered = async (q: DoctorQuestion) => {
    if (!activeCircle) return;
    try {
      await updateQuestion(activeCircle.id, taskId, q.id, {
        answered: !q.answered,
        answerNotes: !q.answered ? q.answerNotes : null,
      });
    } catch {
      showMessage('Failed to update', 'error');
    }
  };

  const handleUpdateNotes = async (q: DoctorQuestion, notes: string) => {
    if (!activeCircle) return;
    await updateQuestion(activeCircle.id, taskId, q.id, { answerNotes: notes || null });
  };

  const handleDelete = async (q: DoctorQuestion) => {
    if (!activeCircle) return;
    try {
      await deleteQuestion(activeCircle.id, taskId, q.id);
      showMessage('Question removed', 'success');
    } catch {
      showMessage('Failed to remove', 'error');
    }
  };

  const unansweredCount = questions.filter((q) => !q.answered).length;
  const canDelete = role && hasMinRole(role, CircleRole.ADMIN);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <HelpOutlineIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>
          Questions for the Doctor
          {unansweredCount > 0 && (
            <Typography component="span" color="primary" sx={{ ml: 0.5 }}>
              ({unansweredCount} unanswered)
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Add question */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          placeholder="Add a question..."
          size="small"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
          fullWidth
          multiline
          maxRows={3}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleAdd}
          disabled={!newQuestion.trim() || adding}
          sx={{ minWidth: 40, px: 1 }}
        >
          <AddIcon fontSize="small" />
        </Button>
      </Box>

      {/* Question list */}
      {questions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No questions yet. Add questions to discuss at the appointment.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {questions.map((q) => (
            <Box
              key={q.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                p: 1,
                borderRadius: 1,
                bgcolor: q.answered ? 'grey.50' : 'background.paper',
                border: 1,
                borderColor: q.answered ? 'grey.200' : 'primary.light',
              }}
            >
              <Checkbox
                checked={q.answered}
                onChange={() => handleToggleAnswered(q)}
                size="small"
                sx={{ mt: -0.5 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    textDecoration: q.answered ? 'line-through' : 'none',
                    color: q.answered ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {q.text}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {q.addedByName} — {formatDateTime(q.createdAt)}
                </Typography>
                <Collapse in={q.answered}>
                  <TextField
                    placeholder="Doctor's response / notes..."
                    size="small"
                    value={q.answerNotes ?? ''}
                    onChange={(e) => handleUpdateNotes(q, e.target.value)}
                    fullWidth
                    multiline
                    maxRows={3}
                    sx={{ mt: 1 }}
                  />
                </Collapse>
              </Box>
              {canDelete && (
                <IconButton size="small" onClick={() => handleDelete(q)} sx={{ mt: -0.5 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
