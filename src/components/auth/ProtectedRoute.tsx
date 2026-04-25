import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#FAF8F5',
          gap: 3,
        }}
      >
        {/* Wordmark uses theme h4 (Fraunces) so the loading screen
            speaks the same brand voice as every other surface. The
            old hardcoded Playfair was a stale leftover from before
            the Direction C font sweep. */}
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          Trellis
        </Typography>
        <CircularProgress size={32} thickness={3} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!firebaseUser) {
    // Preserve the query string on the redirect so flags like
    // ?debug=1 survive the bounce from `/` to `/login`. Without this,
    // the diagnostic panel was unreachable from the root URL.
    const target = `/login${location.search}`;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
