import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
      <CircularProgress size={36} thickness={3} sx={{ color: 'primary.main' }} />
      {message && (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.9rem' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
