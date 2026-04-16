import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import dayjs from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { subscribeExpenses } from '../../services/expenseService';
import type { Expense } from '../../types';

function formatCents(cents: number): string {
  if (!Number.isFinite(cents) || cents === 0) return '$0';
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function MonthSpendCard() {
  const { activeCircle } = useCircle();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = subscribeExpenses(
      activeCircle.id,
      (data) => setExpenses(data),
      () => {}
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  const { thisMonthTotal, deltaPct, projection, thisMonth } = useMemo(() => {
    const now = dayjs();
    const ym = now.format('YYYY-MM');
    const lastYm = now.subtract(1, 'month').format('YYYY-MM');
    const thisMonthTotal = expenses.filter((e) => e.dateYYYYMM === ym).reduce((a, e) => a + e.amount, 0);
    const lastMonthTotal = expenses.filter((e) => e.dateYYYYMM === lastYm).reduce((a, e) => a + e.amount, 0);
    const delta = lastMonthTotal === 0
      ? (thisMonthTotal === 0 ? 0 : null)
      : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    const daysPassed = now.date();
    const daysInMonth = now.daysInMonth();
    const proj = daysPassed > 0 ? (thisMonthTotal / daysPassed) * daysInMonth : 0;
    return { thisMonthTotal, deltaPct: delta, projection: proj, thisMonth: now.format('MMMM') };
  }, [expenses]);

  return (
    <Card
      sx={{ height: '100%', cursor: 'pointer' }}
      onClick={() => navigate('/expenses')}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PaymentsOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            This Month
          </Typography>
        </Box>

        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700} sx={{ fontFamily: '"Playfair Display", serif', lineHeight: 1 }}>
            {formatCents(thisMonthTotal)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {thisMonth} — projected {formatCents(projection)}
          </Typography>
          {deltaPct != null && Math.abs(deltaPct) >= 1 && (
            <Chip
              size="small"
              icon={deltaPct > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${deltaPct > 0 ? '+' : ''}${Math.round(deltaPct)}% vs last month`}
              sx={{
                alignSelf: 'flex-start',
                color: deltaPct > 0 ? 'error.main' : 'success.main',
                '& .MuiChip-icon': { color: deltaPct > 0 ? 'error.main' : 'success.main' },
                bgcolor: 'transparent',
                border: 0,
                pl: 0,
              }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
