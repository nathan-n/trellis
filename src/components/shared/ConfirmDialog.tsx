import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * When true, the dialog renders in destructive mode:
   * - Top border + icon + confirm button use CLAY (not MUI error red).
   * - Clay signals urgency without the alarm-bell siren of MUI's red —
   *   matches Direction C's accent map (clay = urgent/destructive).
   * Review finding 11 — a green "go" top border on destructive deletes
   * read wrong; clay makes the intent unambiguous.
   */
  destructive?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={destructive ? {
        sx: { borderTopColor: 'clay.main' },
      } : undefined}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {destructive ? (
            <WarningAmberIcon sx={{ color: 'clay.main' }} />
          ) : (
            <HelpOutlineIcon color="primary" />
          )}
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={destructive ? { bgcolor: 'clay.main', '&:hover': { bgcolor: 'clay.dark' } } : undefined}
          color={destructive ? undefined : 'primary'}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
