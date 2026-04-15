import { Box, Typography, Button } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useCircle } from '../contexts/CircleContext';
import { CircleRole } from '../constants';
import { hasMinRole, getRoleLabel } from '../utils/roleUtils';

interface RoleGuardProps {
  minRole: CircleRole;
  children: React.ReactNode;
}

export default function RoleGuard({ minRole, children }: RoleGuardProps) {
  const { role } = useCircle();
  const navigate = useNavigate();

  if (!role || !hasMinRole(role, minRole)) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'rgba(124, 111, 155, 0.08)',
            color: 'secondary.main',
            mb: 2.5,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          This page requires {getRoleLabel(minRole)} access or higher.
        </Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
