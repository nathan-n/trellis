import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Toolbar, CircularProgress } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { SIDEBAR_WIDTH } from '../../constants';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile } = useAuth();
  const { activeCircle, loading } = useCircle();

  // While circle data is loading, show spinner — never redirect prematurely
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Only redirect after loading is complete and we know there's no circle
  if (userProfile && (!userProfile.circleIds?.length || !activeCircle)) {
    return <Navigate to="/select-circle" replace />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar onMenuToggle={() => setMobileOpen(!mobileOpen)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflowX: 'hidden',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
