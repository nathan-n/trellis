import { Box, Typography } from '@mui/material';
import MockDevice from '../MockDevice';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Caregiver palette — Direction C (review finding 08). The live
// VisitCalendarPage cycles these exact hex values by caregiver uid.
// Replaces the Material Design 1 blue/green/purple trio that clashed
// with the warm cream surfaces.
const NATHAN = '#3A7D44'; // primary green
const SARAH  = '#7C6F9B'; // plum / secondary
const JAMES  = '#B45A3E'; // clay

const visits: Record<number, { name: string; color: string; tentative?: boolean }[]> = {
  3: [{ name: 'Nathan', color: NATHAN }],
  7: [{ name: 'Sarah', color: SARAH }],
  8: [{ name: 'Sarah', color: SARAH }],
  10: [{ name: 'Nathan', color: NATHAN }],
  11: [{ name: 'Nathan', color: NATHAN }],
  12: [{ name: 'Nathan', color: NATHAN }],
  15: [{ name: 'James', color: JAMES, tentative: true }],
  17: [{ name: 'Sarah', color: SARAH }],
  21: [{ name: 'Nathan', color: NATHAN }],
  24: [{ name: 'Sarah', color: SARAH }, { name: 'James', color: JAMES }],
  28: [{ name: 'Nathan', color: NATHAN }],
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
