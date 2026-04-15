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
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(60,50,40,0.10), 0 2px 8px rgba(60,50,40,0.06)',
        border: 1,
        borderColor: 'rgba(60,50,40,0.1)',
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
          background: 'linear-gradient(90deg, #3A7D44, #2D6B37)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.35)' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.35)' }} />
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.35)' }} />
        </Box>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, ml: 0.5, fontFamily: '"Playfair Display", serif', letterSpacing: 0.5 }}>
          {title ?? 'Trellis'}
        </Typography>
      </Box>
      {/* Content */}
      <Box sx={{ p: 2, bgcolor: '#FFFFFF' }}>
        {children}
      </Box>
    </Box>
  );
}
