import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip,
  IconButton, ToggleButtonGroup, ToggleButton, Tabs, Tab,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import dayjs from 'dayjs';

// Lazy-load Summary tab so recharts only loads when requested
const ExpenseSummaryTab = lazy(() => import('./ExpenseSummaryTab'));
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { subscribeExpenses, deleteExpense } from '../../services/expenseService';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { Expense } from '../../types';
import ExpenseCreateDialog from './ExpenseCreateDialog';
import ConfirmDialog from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import AddFab from '../shared/AddFab';

const categoryLabels: Record<string, string> = {
  medical: 'Medical', supplies: 'Supplies', home_modification: 'Home Mod',
  travel: 'Travel', professional_care: 'Prof. Care', other: 'Other',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ExpenseListPage() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const { showMessage } = useSnackbar();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [monthFilter, setMonthFilter] = useState(dayjs().format('YYYY-MM'));
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeExpenses(
      activeCircle.id,
      (data) => { setExpenses(data); setLoading(false); },
      (err) => { console.error('Expenses error:', err); setLoading(false); }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const filtered = useMemo(
    () => (monthFilter === 'all' ? expenses : expenses.filter((e) => e.dateYYYYMM === monthFilter)),
    [expenses, monthFilter]
  );

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => e.dateYYYYMM));
    return [...set].sort().reverse();
  }, [expenses]);

  const handleDelete = async () => {
    if (!deleteTarget || !activeCircle || !userProfile) return;
    try {
      await deleteExpense(activeCircle.id, deleteTarget, userProfile.uid, userProfile.displayName);
      showMessage('Expense removed', 'success');
    } catch {
      showMessage('Failed to remove expense', 'error');
    }
    setDeleteTarget(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">Expenses</Typography>
      </Box>

      <Tabs
        value={viewMode}
        onChange={(_, v) => setViewMode(v as 'list' | 'summary')}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="list" label="List" />
        <Tab value="summary" label="Summary" />
      </Tabs>

      {viewMode === 'summary' ? (
        <Suspense fallback={<LoadingSpinner />}>
          <ExpenseSummaryTab expenses={expenses} />
        </Suspense>
      ) : (
      <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup value={monthFilter} exclusive onChange={(_, v) => v && setMonthFilter(v)} size="small">
          <ToggleButton value="all">All</ToggleButton>
          {months.map((m) => (
            <ToggleButton key={m} value={m}>{dayjs(m + '-01').format('MMM YYYY')}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Chip label={`Total: ${formatCents(total)}`} color="primary" sx={{ fontWeight: 700, fontSize: '0.95rem' }} />
      </Box>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ReceiptLongIcon />}
          title={expenses.length === 0 ? 'No expenses tracked yet' : 'No expenses this month'}
          description="Track caregiving costs for tax deductions and family cost-sharing."
          actionLabel={expenses.length === 0 ? 'Add Expense' : undefined}
          onAction={expenses.length === 0 ? () => setCreateOpen(true) : undefined}
        />
      ) : null}
      {filtered.length > 0 && (
        <Stack spacing={1} sx={{ pb: 10 }}>
          {filtered.map((expense) => (
            <Card key={expense.id} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>{expense.title}</Typography>
                    <Chip label={categoryLabels[expense.category] ?? expense.category} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(expense.date)} — Paid by {expense.paidByName}
                    {expense.notes && ` — ${expense.notes}`}
                  </Typography>
                </Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                  {formatCents(expense.amount)}
                </Typography>
                {expense.receiptDownloadURL && (
                  <IconButton size="small" component="a" href={expense.receiptDownloadURL} target="_blank" rel="noopener noreferrer">
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                )}
                {((role && hasMinRole(role, CircleRole.ADMIN)) || expense.paidByUid === userProfile?.uid) && (
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(expense)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      </>
      )}

      <ExpenseCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Expense"
        message={`Remove "${deleteTarget?.title}" (${deleteTarget ? formatCents(deleteTarget.amount) : ''})?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />

      {/* FAB visible on both List and Summary tabs so users can add from either */}
      <AddFab
        label="Add Expense"
        onClick={() => setCreateOpen(true)}
        visible={Boolean(role && hasMinRole(role, CircleRole.FAMILY))}
      />
    </Box>
  );
}
