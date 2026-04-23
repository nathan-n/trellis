import { Button, Box } from '@mui/material';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';

interface CallNowButtonProps {
  /** Phone number to dial — shown inline in mono, used in the tel: href. */
  phone: string;
  /** Optional label shown above the phone number (e.g. person name, role). */
  label?: string;
  /** Full-width by default — call-to-action for life-critical moments. */
  fullWidth?: boolean;
}

/**
 * Chunky clay call-to-action for emergency phone numbers. Full-width by
 * default, large touch target (56px), mono phone number. Used in the
 * Emergency page for emergency contacts, physician, pharmacy — anywhere
 * a caregiver under stress needs one-tap dialing.
 *
 * Direction C: clay bg signals urgency without shouting error-red.
 * Design review finding 04 — the previous phone buttons were
 * "primary green, size=small" which buried the primary action.
 */
export default function CallNowButton({ phone, label, fullWidth = true }: CallNowButtonProps) {
  return (
    <Button
      component="a"
      href={`tel:${phone.replace(/[^+\d]/g, '')}`}
      variant="contained"
      fullWidth={fullWidth}
      startIcon={<PhoneIcon />}
      sx={{
        bgcolor: 'clay.main',
        color: 'white',
        py: 1.5,
        px: 2.5,
        minHeight: 56,
        borderRadius: 24,
        fontSize: '1rem',
        fontWeight: 600,
        textTransform: 'none',
        justifyContent: 'flex-start',
        boxShadow: '0 2px 8px rgba(180,90,62,0.20)',
        '&:hover': {
          bgcolor: 'clay.dark',
          boxShadow: '6px 6px 0 rgba(26,22,18,0.08), 0 2px 8px rgba(180,90,62,0.24)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
        {label && (
          <Box component="span" sx={{ fontSize: 12, opacity: 0.88, letterSpacing: '0.04em', fontFamily: '"Instrument Sans", sans-serif' }}>
            Call {label}
          </Box>
        )}
        <Box component="span" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: label ? 15 : 17, letterSpacing: '0.04em' }}>
          {phone}
        </Box>
      </Box>
    </Button>
  );
}
