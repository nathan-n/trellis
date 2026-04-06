import { Box, Typography } from '@mui/material';

interface MockDeviceProps {
  children: React.ReactNode;
  title?: string;
  maxWidth?: number;
}

export default function MockDevice({ children, title, maxWidth = 480 }: MockDeviceProps) {
  return (
    <Box
      sx={{
        maxWidth,
        width: '100%',
        mx: 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
        </Box>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, ml: 0.5 }}>
          {title ?? 'Trellis'}
        </Typography>
      </Box>
      {/* Content */}
      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
        {children}
      </Box>
    </Box>
  );
}
