import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Direction C typographic accent: italic Fraunces in plum with a slightly
 * heavier optical axis ("SOFT" 120) to give the italic a soft, editorial
 * voice — the "Good morning — *a quiet morning so far*" moment.
 *
 * Drop it inside any heading or body Typography to highlight a phrase.
 * Inherits font size from the surrounding Typography, so visual weight
 * stays proportional wherever it's used.
 *
 * Example:
 *   <Typography variant="h5">
 *     My Next <SerifAccent>Priority</SerifAccent>
 *   </Typography>
 */
export default function SerifAccent({ children }: { children: ReactNode }) {
  return (
    <Box
      component="em"
      sx={{
        fontFamily: '"Fraunces", "Iowan Old Style", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 500,
        color: 'secondary.main',
        fontVariationSettings: '"opsz" 72, "SOFT" 120',
      }}
    >
      {children}
    </Box>
  );
}
