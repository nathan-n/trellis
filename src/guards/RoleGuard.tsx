import { Box, Typography, Button } from '@mui/material';
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
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This page requires {getRoleLabel(minRole)} access or higher.
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
