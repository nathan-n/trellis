import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  /**
   * Contextual status line that appears above the title. Rendered as the
   * theme's overline (mono, plum, uppercase, 0.14em tracking). Keep it
   * short and factual — counts, summaries, date context.
   * Example: "12 active · 3 need refill"
   */
  overline?: ReactNode;
  /** Main page title. Pass a string, or JSX to include <SerifAccent>. */
  title: ReactNode;
  /** Optional action slot rendered on the right side of the header
   *  (above the title row on narrow viewports). */
  action?: ReactNode;
}

/**
 * Direction C page header. The dashboard established this pattern
 * (mono/plum overline + Fraunces serif title, optional italic plum
 * SerifAccent), but list pages were shipping plain <Typography h5>.
 * This component consolidates the treatment so every page feels like
 * the same product.
 *
 * Finding 05 from the April 2026 design review.
 */
export default function PageHeader({ overline, title, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {overline && (
          <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
            {overline}
          </Typography>
        )}
        <Typography variant="h4" sx={{ lineHeight: 1.15 }}>
          {title}
        </Typography>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}
