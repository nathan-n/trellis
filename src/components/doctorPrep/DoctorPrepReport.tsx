import { Box, Typography, Divider, Table, TableBody, TableCell, TableHead, TableRow, Chip, Stack } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { DoctorPrepData } from '../../services/doctorPrepService';
import type { DoctorQuestion } from '../../types';
import { useCircle } from '../../contexts/CircleContext';

interface DoctorPrepReportProps {
  data: DoctorPrepData;
  startDate: string;
  endDate: string;
  questions?: DoctorQuestion[];
}

export default function DoctorPrepReport({ data, startDate, endDate, questions }: DoctorPrepReportProps) {
  const { activeCircle } = useCircle();

  // Mood summary
  const moodCounts = new Map<string, number>();
  data.careLogs.forEach((log) => {
    moodCounts.set(log.mood, (moodCounts.get(log.mood) ?? 0) + 1);
  });

  // Behavior summary
  const behaviorCounts = new Map<string, number>();
  data.careLogs.forEach((log) => {
    log.behaviors?.forEach((b) => {
      behaviorCounts.set(b, (behaviorCounts.get(b) ?? 0) + 1);
    });
  });

  // Sleep summary
  const sleepEntries = data.careLogs.filter((l) => l.sleep?.quality);
  const avgSleep = sleepEntries.length
    ? sleepEntries.reduce((sum, l) => sum + (l.sleep?.hoursSlept ?? 0), 0) / sleepEntries.length
    : 0;

  return (
    <Box sx={{
      '@media print': { p: 0, m: 0, fontSize: '12px' },
    }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Care Summary Report
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {activeCircle?.patientName} — {startDate} to {endDate}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Medications */}
      <Typography variant="h6" fontWeight={600} gutterBottom>Current Medications</Typography>
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell><strong>Medication</strong></TableCell>
            <TableCell><strong>Dosage</strong></TableCell>
            <TableCell><strong>Frequency</strong></TableCell>
            <TableCell><strong>Doses Logged</strong></TableCell>
            <TableCell><strong>Skipped</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.medications.filter((m) => m.isActive).map((med) => {
            const logs = data.administrationLogs.get(med.id) ?? [];
            const given = logs.filter((l) => !l.skipped).length;
            const skipped = logs.filter((l) => l.skipped).length;
            return (
              <TableRow key={med.id}>
                <TableCell>{med.name}</TableCell>
                <TableCell>{med.dosage}</TableCell>
                <TableCell>{med.frequency}</TableCell>
                <TableCell>{given}</TableCell>
                <TableCell>{skipped > 0 ? <Chip label={skipped} size="small" color="warning" /> : 0}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Mood & Behavior Summary */}
      <Typography variant="h6" fontWeight={600} gutterBottom>Mood & Behavior Summary</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Based on {data.careLogs.length} care log entries in this period.
      </Typography>
      {moodCounts.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Mood Distribution:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
            {[...moodCounts.entries()].map(([mood, count]) => (
              <Chip key={mood} label={`${mood}: ${count}`} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}
      {behaviorCounts.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Observed Behaviors:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
            {[...behaviorCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([behavior, count]) => (
                <Chip key={behavior} label={`${behavior} (${count}x)`} size="small" variant="outlined" />
              ))}
          </Stack>
        </Box>
      )}

      {/* Sleep */}
      {sleepEntries.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Sleep: avg {avgSleep.toFixed(1)} hours/night
            ({sleepEntries.filter((l) => l.sleep?.quality === 'poor').length} poor nights)
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Care Log Notes */}
      {data.careLogs.filter((l) => l.generalNotes).length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>Notable Observations</Typography>
          {data.careLogs
            .filter((l) => l.generalNotes)
            .map((log) => (
              <Box key={log.id} sx={{ mb: 1, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">{log.logDate} — {log.authorName}</Typography>
                <Typography variant="body2">{log.generalNotes}</Typography>
              </Box>
            ))}
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Questions for the Doctor */}
      {questions && questions.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Questions to Discuss
          </Typography>
          {questions.filter((q) => !q.answered).map((q) => (
            <Box key={q.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              <CheckBoxOutlineBlankIcon sx={{ fontSize: '1.1rem', mt: 0.2, color: 'text.secondary' }} />
              <Typography variant="body2">{q.text}</Typography>
            </Box>
          ))}
          {questions.some((q) => q.answered) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Previously Answered
              </Typography>
              {questions.filter((q) => q.answered).map((q) => (
                <Box key={q.id} sx={{ mb: 1, opacity: 0.7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <CheckBoxIcon sx={{ fontSize: '1.1rem', mt: 0.2, color: 'success.main' }} />
                    <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{q.text}</Typography>
                  </Box>
                  {q.answerNotes && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5, fontStyle: 'italic' }}>
                      {q.answerNotes}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {/* Completed Tasks */}
      {data.completedTasks.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Completed Tasks ({data.completedTasks.length})
          </Typography>
          {data.completedTasks.map((task) => (
            <Typography key={task.id} variant="body2" sx={{ mb: 0.5 }}>
              - {task.title} ({task.category})
            </Typography>
          ))}
        </>
      )}
    </Box>
  );
}
