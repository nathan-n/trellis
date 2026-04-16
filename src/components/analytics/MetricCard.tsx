import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Positive = went up vs prior window, negative = down, null = unknown or not shown */
  deltaPct?: number | null;
  /** When true, going up is bad (e.g., refusals, overdue) — flips arrow color */
  inverted?: boolean;
  accentColor?: string;
}

export default function MetricCard({
  label,
  value,
  sublabel,
  deltaPct,
  inverted = false,
  accentColor,
}: Props) {
  let deltaIcon: ReactNode = null;
  let deltaColor: 'success.main' | 'error.main' | 'text.secondary' = 'text.secondary';
  let deltaLabel: string | null = null;

  if (deltaPct != null && Number.isFinite(deltaPct)) {
    if (Math.abs(deltaPct) < 1) {
      deltaIcon = <TrendingFlatIcon fontSize="inherit" />;
      deltaColor = 'text.secondary';
      deltaLabel = '≈ prior';
    } else {
      const isUp = deltaPct > 0;
      const isPositiveSignal = inverted ? !isUp : isUp;
      deltaIcon = isUp ? <TrendingUpIcon fontSize="inherit" /> : <TrendingDownIcon fontSize="inherit" />;
      deltaColor = isPositiveSignal ? 'success.main' : 'error.main';
      deltaLabel = `${isUp ? '+' : ''}${Math.round(deltaPct)}% vs prior`;
    }
  }

  return (
    <Card sx={{ height: '100%', borderLeft: accentColor ? 4 : 0, borderLeftColor: accentColor }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, fontFamily: '"Playfair Display", serif' }}>
          {value}
        </Typography>
        {sublabel && (
          <Box sx={{ mt: 0.5 }}>
            {typeof sublabel === 'string' ? (
              <Typography variant="body2" color="text.secondary">{sublabel}</Typography>
            ) : (
              sublabel
            )}
          </Box>
        )}
        {deltaLabel && (
          <Chip
            size="small"
            icon={deltaIcon as React.ReactElement}
            label={deltaLabel}
            sx={{
              mt: 1,
              color: deltaColor,
              '& .MuiChip-icon': { color: deltaColor },
              bgcolor: 'transparent',
              border: 0,
              pl: 0,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
