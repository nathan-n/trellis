import { Box, Button, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useState } from 'react';

export default function LoginPage() {
  const { firebaseUser, loading, signIn } = useAuth();
  const { showMessage } = useSnackbar();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  // Already authenticated — redirect to app
  if (!loading && firebaseUser) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
      navigate('/');
    } catch (err) {
      console.error('Sign in error:', err);
      showMessage('Failed to sign in. Please try again.', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
          <Typography variant="h3" fontWeight={700} color="primary" gutterBottom>
            Trellis
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Caregiving coordination for your family. Together.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={signingIn ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleSignIn}
            disabled={signingIn}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
