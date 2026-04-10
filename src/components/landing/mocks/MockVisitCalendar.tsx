import { Box, Typography } from '@mui/material';
import MockDevice from '../MockDevice';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const visits: Record<number, { name: string; color: string; tentative?: boolean }[]> = {
  3: [{ name: 'Nathan', color: '#1976d2' }],
  7: [{ name: 'Sarah', color: '#388e3c' }],
  8: [{ name: 'Sarah', color: '#388e3c' }],
  10: [{ name: 'Nathan', color: '#1976d2' }],
  11: [{ name: 'Nathan', color: '#1976d2' }],
  12: [{ name: 'Nathan', color: '#1976d2' }],
  15: [{ name: 'James', color: '#7b1fa2', tentative: true }],
  17: [{ name: 'Sarah', color: '#388e3c' }],
  21: [{ name: 'Nathan', color: '#1976d2' }],
  24: [{ name: 'Sarah', color: '#388e3c' }, { name: 'James', color: '#7b1fa2' }],
  28: [{ name: 'Nathan', color: '#1976d2' }],
};

export default function MockVisitCalendar() {
  return (
    <MockDevice title="Visit Schedule — April 2026">
      <Box>
        {/* Day headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
          {days.map((d) => (
            <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.6rem', color: 'text.secondary' }}>
              {d}
            </Typography>
          ))}
        </Box>
        {/* Calendar grid — 5 weeks */}
        {[0, 1, 2, 3, 4].map((week) => (
          <Box key={week} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
              const dayNum = week * 7 + dow - 2; // offset so 1st falls on Wednesday
              const isValid = dayNum >= 1 && dayNum <= 30;
              const dayVisits = isValid ? visits[dayNum] ?? [] : [];
              return (
                <Box
                  key={dow}
                  sx={{
                    minHeight: 44,
                    borderRadius: 0.5,
                    border: 1,
                    borderColor: isValid ? 'divider' : 'transparent',
                    p: 0.3,
                    bgcolor: isValid ? 'background.paper' : 'transparent',
                  }}
                >
                  {isValid && (
                    <>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        {dayNum}
                      </Typography>
                      {dayVisits.map((v, i) => (
                        <Box
                          key={i}
                          sx={{
                            bgcolor: v.tentative ? `${v.color}25` : v.color,
                            color: v.tentative ? v.color : 'white',
                            border: v.tentative ? `1px dashed ${v.color}` : 'none',
                            borderRadius: 0.5,
                            px: 0.5,
                            mt: 0.2,
                            fontSize: '0.5rem',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {v.name}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </MockDevice>
  );
}
