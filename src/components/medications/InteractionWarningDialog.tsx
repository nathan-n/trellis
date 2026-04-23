import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert, Typography, Stack,
} from '@mui/material';
import type { InteractionWarning } from '../../services/openFdaService';

interface InteractionWarningDialogProps {
  open: boolean;
  warnings: InteractionWarning[];
  onProceed: () => void;
  onCancel: () => void;
}

export default function InteractionWarningDialog({ open, warnings, onProceed, onCancel }: InteractionWarningDialogProps) {
  return (
    // Warning variant: ochre top border (not the default primary-green).
    // Direction C accent map — ochre carries "caution / attention" weight
    // without the destructive urgency of clay. Review finding 11.
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderTopColor: 'ochre.main' } }}
    >
      <DialogTitle>Potential Drug Interactions</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The following potential interactions were found based on FDA drug label data.
          Please consult with a healthcare provider for authoritative guidance.
        </Typography>
        <Stack spacing={1.5}>
          {warnings.map((w, i) => (
            <Alert key={i} severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Interaction with {w.existingMedName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {w.warningText}
              </Typography>
            </Alert>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onProceed}
          variant="contained"
          sx={{ bgcolor: 'ochre.main', '&:hover': { bgcolor: 'ochre.dark' }, color: 'white' }}
        >
          Add Anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
}
