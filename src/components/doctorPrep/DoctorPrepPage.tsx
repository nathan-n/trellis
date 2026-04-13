import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, Stack, Card, CardContent } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import PrintIcon from '@mui/icons-material/Print';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs, { type Dayjs } from 'dayjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fetchDoctorPrepData, type DoctorPrepData } from '../../services/doctorPrepService';
import { fetchQuestions } from '../../services/questionService';
import type { Task, DoctorQuestion } from '../../types';
import DoctorPrepReport from './DoctorPrepReport';
import TaskQuestions from '../tasks/TaskQuestions';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function DoctorPrepPage() {
  const [searchParams] = useSearchParams();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const taskIdParam = searchParams.get('taskId');
  const [startDate, setStartDate] = useState<Dayjs>(fromParam ? dayjs(fromParam) : dayjs().subtract(30, 'day'));
  const [endDate, setEndDate] = useState<Dayjs>(toParam ? dayjs(toParam) : dayjs());
  const [autoGenerate, setAutoGenerate] = useState(Boolean(fromParam && toParam));
  const [data, setData] = useState<DoctorPrepData | null>(null);
  const [questions, setQuestions] = useState<DoctorQuestion[]>([]);
  const [appointmentTask, setAppointmentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Load appointment task context when taskId is present
  useEffect(() => {
    if (!activeCircle || !taskIdParam) return;
    const unsubscribe = onSnapshot(
      doc(db, 'circles', activeCircle.id, 'tasks', taskIdParam),
      (snap) => {
        if (snap.exists()) {
          setAppointmentTask({ id: snap.id, ...snap.data() } as Task);
        }
      },
      () => {}
    );
    return unsubscribe;
  }, [activeCircle?.id, taskIdParam]);

  // Auto-generate when linked from an appointment
  useEffect(() => {
    if (autoGenerate && activeCircle) {
      setAutoGenerate(false);
      handleGenerate();
    }
  }, [autoGenerate, activeCircle]);

  const handleGenerate = async () => {
    if (!activeCircle) return;
    setLoading(true);
    try {
      const result = await fetchDoctorPrepData(
        activeCircle.id,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );

      // Fetch questions if linked from an appointment
      let taskQuestions: DoctorQuestion[] = [];
      if (taskIdParam) {
        taskQuestions = await fetchQuestions(activeCircle.id, taskIdParam);
      }
      setQuestions(taskQuestions);
      setData(result);
    } catch (err) {
      console.error('Doctor prep error:', err);
      showMessage('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const doctorName = appointmentTask?.appointmentDetails?.doctorName;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Doctor Visit Prep</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {doctorName
          ? `Preparing for appointment with ${doctorName}`
          : 'Generate a summary of care logs, medications, and observations for a date range to bring to a doctor appointment.'}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <DatePicker
              label="From"
              value={startDate}
              onChange={(v) => v && setStartDate(v)}
              maxDate={endDate}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="To"
              value={endDate}
              onChange={(v) => v && setEndDate(v)}
              minDate={startDate}
              maxDate={dayjs()}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button
              variant="contained"
              startIcon={<SummarizeIcon />}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {data && (
              <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Questions section — only when linked from an appointment */}
      {taskIdParam && activeCircle && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TaskQuestions taskId={taskIdParam} />
          </CardContent>
        </Card>
      )}

      {loading && <LoadingSpinner message="Gathering care data..." />}

      {data && (
        <Card>
          <CardContent>
            <DoctorPrepReport
              data={data}
              startDate={startDate.format('YYYY-MM-DD')}
              endDate={endDate.format('YYYY-MM-DD')}
              questions={questions.length > 0 ? questions : undefined}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
