import { Box, Typography, Divider } from '@mui/material';
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

const sectionSx = {
  mb: 3,
  '@media print': { mb: 2, breakInside: 'avoid' as const },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="h6"
      fontWeight={700}
      sx={{
        fontSize: '1rem',
        mb: 1,
        pb: 0.5,
        borderBottom: '2px solid',
        borderColor: 'primary.main',
        '@media print': { fontSize: '11pt', borderColor: '#333', color: '#000' },
      }}
    >
      {children}
    </Typography>
  );
}

export default function DoctorPrepReport({ data, startDate, endDate, questions }: DoctorPrepReportProps) {
  const { activeCircle } = useCircle();

  const moodCounts = new Map<string, number>();
  data.careLogs.forEach((log) => {
    moodCounts.set(log.mood, (moodCounts.get(log.mood) ?? 0) + 1);
  });

  const behaviorCounts = new Map<string, number>();
  data.careLogs.forEach((log) => {
    log.behaviors?.forEach((b) => {
      behaviorCounts.set(b, (behaviorCounts.get(b) ?? 0) + 1);
    });
  });

  const sleepEntries = data.careLogs.filter((l) => l.sleep?.quality);
  const avgSleep = sleepEntries.length
    ? sleepEntries.reduce((sum, l) => sum + (l.sleep?.hoursSlept ?? 0), 0) / sleepEntries.length
    : 0;

  return (
    <Box
      className="doctor-prep-report"
      sx={{
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        '@media print': {
          p: 0, m: 0, color: '#000',
          '& *': { colorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, '@media print': { mb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: '1.5rem', '@media print': { fontSize: '16pt', color: '#000' } }}>
            Care Summary Report
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ '@media print': { color: '#666', fontSize: '8pt' } }}>
            Trellis
          </Typography>
        </Box>
        <Typography variant="body1" fontWeight={600} sx={{ '@media print': { fontSize: '11pt', color: '#000' } }}>
          {activeCircle?.patientName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ '@media print': { fontSize: '9pt', color: '#444' } }}>
          {startDate} to {endDate}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2, '@media print': { borderColor: '#ccc' } }} />

      {/* Medications Table */}
      <Box sx={sectionSx}>
        <SectionTitle>Current Medications</SectionTitle>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', '@media print': { fontSize: '9pt' } }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider', '@media print': { borderColor: '#ccc' } }}>
              <Box component="th" sx={{ textAlign: 'left', py: 0.5, fontWeight: 600 }}>Medication</Box>
              <Box component="th" sx={{ textAlign: 'left', py: 0.5, fontWeight: 600 }}>Dosage</Box>
              <Box component="th" sx={{ textAlign: 'left', py: 0.5, fontWeight: 600 }}>Frequency</Box>
              <Box component="th" sx={{ textAlign: 'center', py: 0.5, fontWeight: 600 }}>Given</Box>
              <Box component="th" sx={{ textAlign: 'center', py: 0.5, fontWeight: 600 }}>Skipped</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {data.medications.filter((m) => m.isActive).map((med) => {
              const logs = data.administrationLogs.get(med.id) ?? [];
              const given = logs.filter((l) => !l.skipped).length;
              const skipped = logs.filter((l) => l.skipped).length;
              return (
                <Box component="tr" key={med.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', '@media print': { borderColor: '#eee' } }}>
                  <Box component="td" sx={{ py: 0.5, fontWeight: 500 }}>{med.name}</Box>
                  <Box component="td" sx={{ py: 0.5 }}>{med.dosage}</Box>
                  <Box component="td" sx={{ py: 0.5 }}>{med.frequency}</Box>
                  <Box component="td" sx={{ py: 0.5, textAlign: 'center' }}>{given}</Box>
                  <Box component="td" sx={{ py: 0.5, textAlign: 'center', fontWeight: skipped > 0 ? 700 : 400, color: skipped > 0 ? '#ed6c02' : 'inherit', '@media print': { color: skipped > 0 ? '#000' : 'inherit' } }}>
                    {skipped}{skipped > 0 ? ' !' : ''}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Mood & Behavior */}
      <Box sx={sectionSx}>
        <SectionTitle>Mood & Behavior Summary</SectionTitle>
        <Typography variant="body2" sx={{ mb: 1, '@media print': { fontSize: '9pt' } }}>
          Based on {data.careLogs.length} care log entries.
        </Typography>
        {moodCounts.size > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, '@media print': { fontSize: '9pt' } }}>Mood Distribution:</Typography>
            <Typography variant="body2" sx={{ '@media print': { fontSize: '9pt' } }}>
              {[...moodCounts.entries()].map(([mood, count]) => `${mood}: ${count}`).join('  |  ')}
            </Typography>
          </Box>
        )}
        {behaviorCounts.size > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, '@media print': { fontSize: '9pt' } }}>Observed Behaviors:</Typography>
            <Typography variant="body2" sx={{ '@media print': { fontSize: '9pt' } }}>
              {[...behaviorCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([behavior, count]) => `${behavior} (${count}x)`)
                .join('  |  ')}
            </Typography>
          </Box>
        )}
        {sleepEntries.length > 0 && (
          <Typography variant="body2" sx={{ '@media print': { fontSize: '9pt' } }}>
            <strong>Sleep:</strong> avg {avgSleep.toFixed(1)} hours/night
            ({sleepEntries.filter((l) => l.sleep?.quality === 'poor').length} poor nights)
          </Typography>
        )}
      </Box>

      {/* Notable Observations */}
      {data.careLogs.filter((l) => l.generalNotes).length > 0 && (
        <Box sx={sectionSx}>
          <SectionTitle>Notable Observations</SectionTitle>
          {data.careLogs
            .filter((l) => l.generalNotes)
            .map((log) => (
              <Box key={log.id} sx={{ mb: 1, pl: 1.5, borderLeft: '3px solid', borderColor: 'grey.300', '@media print': { borderColor: '#ccc' } }}>
                <Typography variant="caption" color="text.secondary" sx={{ '@media print': { fontSize: '8pt', color: '#666' } }}>
                  {log.logDate} — {log.authorName}
                </Typography>
                <Typography variant="body2" sx={{ '@media print': { fontSize: '9pt' } }}>{log.generalNotes}</Typography>
              </Box>
            ))}
        </Box>
      )}

      {/* Questions for the Doctor */}
      {questions && questions.length > 0 && (
        <Box sx={sectionSx}>
          <SectionTitle>Questions to Discuss</SectionTitle>
          {questions.filter((q) => !q.answered).map((q) => (
            <Box key={q.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, '@media print': { mb: 1 } }}>
              <CheckBoxOutlineBlankIcon sx={{ fontSize: '1rem', mt: 0.2, color: 'text.secondary', flexShrink: 0, '@media print': { color: '#666' } }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ '@media print': { fontSize: '9pt' } }}>{q.text}</Typography>
                {/* Dotted line for handwriting answer during visit — print only */}
                <Box sx={{ display: 'none', '@media print': { display: 'block', borderBottom: '1px dotted #bbb', height: 18, mt: 0.5 } }} />
              </Box>
            </Box>
          ))}
          {questions.some((q) => q.answered) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, '@media print': { fontSize: '9pt', color: '#666' } }}>
                Previously Answered
              </Typography>
              {questions.filter((q) => q.answered).map((q) => (
                <Box key={q.id} sx={{ mb: 1, opacity: 0.7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <CheckBoxIcon sx={{ fontSize: '1rem', mt: 0.2, color: 'success.main', flexShrink: 0, '@media print': { color: '#666' } }} />
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', '@media print': { fontSize: '9pt' } }}>{q.text}</Typography>
                  </Box>
                  {q.answerNotes && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 3, fontStyle: 'italic', '@media print': { fontSize: '8pt', color: '#444' } }}>
                      {q.answerNotes}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Completed Tasks */}
      {data.completedTasks.length > 0 && (
        <Box sx={sectionSx}>
          <SectionTitle>Completed Tasks ({data.completedTasks.length})</SectionTitle>
          {data.completedTasks.map((task) => (
            <Typography key={task.id} variant="body2" sx={{ mb: 0.5, '@media print': { fontSize: '9pt' } }}>
              - {task.title} ({task.category})
            </Typography>
          ))}
        </Box>
      )}

      {/* Print footer */}
      <Box sx={{ mt: 4, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'none', '@media print': { display: 'flex', justifyContent: 'space-between', borderColor: '#ccc' } }}>
        <Typography sx={{ fontSize: '8pt', color: '#999' }}>
          Generated by Trellis
        </Typography>
        <Typography sx={{ fontSize: '8pt', color: '#999' }}>
          Printed {new Date().toLocaleDateString()}
        </Typography>
      </Box>
    </Box>
  );
}
