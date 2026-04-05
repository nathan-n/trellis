import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { SIDEBAR_WIDTH } from '../../constants';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile } = useAuth();
  const { activeCircle, loading } = useCircle();

  // If user has no circles, redirect to circle selection
  if (!loading && userProfile && (!userProfile.circleIds?.length || !activeCircle)) {
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
          p: 3,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar /> {/* Spacer for fixed app bar */}
        <Outlet />
      </Box>
    </Box>
  );
}
