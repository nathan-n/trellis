import { createTheme, type PaletteColorOptions } from '@mui/material/styles';

// Trellis Direction C — warm, tactile, paper-forward. Tokens match
// trellis-design-system/project/index.html (the promoted baseline).

const serifFont = '"Fraunces", "Iowan Old Style", Georgia, serif';
const sansFont = '"Instrument Sans", ui-sans-serif, system-ui, "Helvetica", "Arial", sans-serif';
const monoFont = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// Module augmentation: extend MUI palette with brand accents so they're
// consumable as theme.palette.clay.main etc. These are defined here but
// not applied automatically anywhere — available for future component use.
declare module '@mui/material/styles' {
  interface Palette {
    clay: Palette['primary'];
    ochre: Palette['primary'];
    slate: Palette['primary'];
    rose: Palette['primary'];
  }
  interface PaletteOptions {
    clay?: PaletteColorOptions;
    ochre?: PaletteColorOptions;
    slate?: PaletteColorOptions;
    rose?: PaletteColorOptions;
  }
  interface TypographyVariants {
    mono: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#3A7D44', // Warm organic green
      light: '#6DB97B',
      dark: '#2D6B37',
      contrastText: '#fff',
    },
    secondary: {
      main: '#7C6F9B', // Warm muted purple
      light: '#A99BC5',
      dark: '#524470',
      contrastText: '#fff',
    },
    // Extended brand accents (defined, not yet used — available for
    // future component styling via theme.palette.{clay,ochre,slate,rose}).
    clay: {
      main: '#B45A3E',
      light: '#F5DDD2',
      dark: '#8A4530',
      contrastText: '#fff',
    },
    ochre: {
      main: '#C48B2E',
      light: '#F3E2B9',
      dark: '#8F6520',
      contrastText: '#fff',
    },
    slate: {
      main: '#4A5A6E',
      light: '#D6DDE5',
      dark: '#343F50',
      contrastText: '#fff',
    },
    rose: {
      main: '#B86B7E',
      light: '#F2DCE1',
      dark: '#8E4E5E',
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
      default: '#F7F3EC', // Warm cream (slightly deeper than previous #FAF8F5)
      paper: '#FDFBF6',   // Paper — warm off-white, not pure
    },
    text: {
      primary: '#1A1612',   // Warm ink (not pure black)
      secondary: '#4A443B', // Muted secondary
      disabled: '#B8B0A3',
    },
    divider: 'rgba(26,22,18,0.10)',
  },
  typography: {
    fontFamily: sansFont,
    // Fraunces variable axes: opsz (optical sizing) + SOFT (friendliness).
    // Higher opsz for display, SOFT 80 gives slightly rounder terminals.
    h1: {
      fontFamily: serifFont,
      fontWeight: 500,
      letterSpacing: '-0.022em',
      fontVariationSettings: '"opsz" 96, "SOFT" 80',
    },
    h2: {
      fontFamily: serifFont,
      fontWeight: 500,
      letterSpacing: '-0.018em',
      fontVariationSettings: '"opsz" 72, "SOFT" 80',
    },
    h3: {
      fontFamily: serifFont,
      fontWeight: 500,
      letterSpacing: '-0.015em',
      fontVariationSettings: '"opsz" 48, "SOFT" 80',
    },
    h4: {
      fontFamily: serifFont,
      fontWeight: 500,
      letterSpacing: '-0.01em',
      fontVariationSettings: '"opsz" 36, "SOFT" 80',
    },
    h5: {
      fontFamily: serifFont,
      fontWeight: 500,
      letterSpacing: '-0.005em',
      fontVariationSettings: '"opsz" 24, "SOFT" 80',
    },
    h6: {
      fontFamily: serifFont,
      fontWeight: 500,
      fontVariationSettings: '"opsz" 18, "SOFT" 80',
    },
    // New variant: monospace face for timestamps, metadata, eyebrows,
    // overlines. Consumable as <Typography variant="mono">.
    mono: {
      fontFamily: monoFont,
      fontSize: '0.8125rem',
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 14,
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
          borderRadius: 14,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          borderTop: '4px solid #3A7D44',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: serifFont,
          fontWeight: 500,
          fontSize: '1.25rem',
          paddingBottom: 4,
          fontVariationSettings: '"opsz" 24, "SOFT" 80',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
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
