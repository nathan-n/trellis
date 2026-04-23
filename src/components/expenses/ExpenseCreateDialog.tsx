import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloudUploadIcon from '@mui/icons-material/CloudUploadOutlined';
import dayjs, { type Dayjs } from 'dayjs';
import { ExpenseCategory } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createExpense } from '../../services/expenseService';

const categoryLabels: Record<string, string> = {
  medical: 'Medical',
  supplies: 'Supplies',
  home_modification: 'Home Modification',
  travel: 'Travel',
  professional_care: 'Professional Care',
  other: 'Other',
};

interface ExpenseCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExpenseCreateDialog({ open, onClose }: ExpenseCreateDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(ExpenseCategory.OTHER);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !amount || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      await createExpense(
        activeCircle.id,
        userProfile.uid,
        userProfile.displayName,
        {
          title: title.trim(),
          amount: cents,
          category,
          date: date.toDate(),
          notes: notes.trim() || null,
        },
        receiptFile ?? undefined
      );
      showMessage('Expense added', 'success');
      handleClose();
    } catch (err) {
      console.error('Expense error:', err);
      showMessage('Failed to add expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle(''); setAmount(''); setCategory(ExpenseCategory.OTHER);
    setDate(dayjs()); setNotes(''); setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Expense</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Description" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            required
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(categoryLabels).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker label="Date" value={date} onChange={(v) => v && setDate(v)} slotProps={{ textField: { fullWidth: true } }} />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
          <Box>
            <Button startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()} variant="outlined" size="small">
              {receiptFile ? receiptFile.name : 'Attach Receipt'}
            </Button>
            <input type="file" ref={fileInputRef} onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} hidden accept="image/*,.pdf" />
            {receiptFile && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {(receiptFile.size / 1024).toFixed(0)} KB
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!title.trim() || !amount || saving}>
          {saving ? 'Saving...' : 'Add Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
