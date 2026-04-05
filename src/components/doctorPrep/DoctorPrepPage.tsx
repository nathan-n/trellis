import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import PrintIcon from '@mui/icons-material/Print';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs, { type Dayjs } from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fetchDoctorPrepData, type DoctorPrepData } from '../../services/doctorPrepService';
import DoctorPrepReport from './DoctorPrepReport';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function DoctorPrepPage() {
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(30, 'day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<DoctorPrepData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!activeCircle) return;
    setLoading(true);
    try {
      const result = await fetchDoctorPrepData(
        activeCircle.id,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      setData(result);
    } catch (err) {
      console.error('Doctor prep error:', err);
      showMessage('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Doctor Visit Prep</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate a summary of care logs, medications, and observations for a date range to bring to a doctor appointment.
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

      {loading && <LoadingSpinner message="Gathering care data..." />}

      {data && (
        <Card>
          <CardContent>
            <DoctorPrepReport
              data={data}
              startDate={startDate.format('YYYY-MM-DD')}
              endDate={endDate.format('YYYY-MM-DD')}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
