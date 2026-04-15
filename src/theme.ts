import { createTheme } from '@mui/material/styles';

const serifFont = '"Playfair Display", "Georgia", serif';
const sansFont = '"Inter", "Helvetica", "Arial", sans-serif';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3A7D44', // Warm organic green
      light: '#6DB97B',
      dark: '#1B5E20',
      contrastText: '#fff',
    },
    secondary: {
      main: '#7C6F9B', // Warm muted purple
      light: '#A99BC5',
      dark: '#524470',
      contrastText: '#fff',
    },
    error: {
      main: '#C62828',
    },
    warning: {
      main: '#F9A825',
    },
    success: {
      main: '#388E3C',
    },
    background: {
      default: '#FAF8F5', // Warm cream
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: sansFont,
    h1: {
      fontFamily: serifFont,
      fontWeight: 700,
    },
    h2: {
      fontFamily: serifFont,
      fontWeight: 700,
    },
    h3: {
      fontFamily: serifFont,
      fontWeight: 700,
    },
    h4: {
      fontFamily: serifFont,
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 24,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(60,50,40,0.07), 0 1px 3px rgba(60,50,40,0.05)',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
