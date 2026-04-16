import { useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, Chip } from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import type { Expense } from '../../types';
import MetricCard from '../analytics/MetricCard';

interface Props {
  expenses: Expense[];
}

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical',
  supplies: 'Supplies',
  home_modification: 'Home Mod',
  travel: 'Travel',
  professional_care: 'Prof. Care',
  other: 'Other',
};

// Category palette — warm, distinct, aligned with theme
const CATEGORY_COLORS: Record<string, string> = {
  medical: '#3A7D44',           // primary (green)
  supplies: '#7C6F9B',          // secondary (purple)
  home_modification: '#E65100', // orange
  travel: '#1565C0',            // blue
  professional_care: '#00695C', // teal
  other: '#9E9E9E',             // grey
};

function formatCents(cents: number): string {
  if (!Number.isFinite(cents) || cents === 0) return '$0';
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function percentDelta(current: number, prior: number): number | null {
  if (prior === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - prior) / prior) * 100;
}

type WindowKind = 'month' | 'ytd' | 'last12';

function filterByWindow(expenses: Expense[], kind: WindowKind): Expense[] {
  const now = dayjs();
  if (kind === 'month') {
    const ym = now.format('YYYY-MM');
    return expenses.filter((e) => e.dateYYYYMM === ym);
  }
  if (kind === 'ytd') {
    return expenses.filter((e) => dayjs(e.date.toDate()).year() === now.year());
  }
  // last12: rolling 12 months inclusive of current
  const cutoff = now.subtract(11, 'month').startOf('month');
  return expenses.filter((e) => dayjs(e.date.toDate()).isAfter(cutoff.subtract(1, 'day')));
}

export default function ExpenseSummaryTab({ expenses }: Props) {
  // Metric cards
  const metrics = useMemo(() => {
    const now = dayjs();
    const thisMonth = now.format('YYYY-MM');
    const lastMonth = now.subtract(1, 'month').format('YYYY-MM');

    const thisMonthTotal = expenses
      .filter((e) => e.dateYYYYMM === thisMonth)
      .reduce((a, e) => a + e.amount, 0);
    const lastMonthTotal = expenses
      .filter((e) => e.dateYYYYMM === lastMonth)
      .reduce((a, e) => a + e.amount, 0);
    const ytdTotal = expenses
      .filter((e) => dayjs(e.date.toDate()).year() === now.year())
      .reduce((a, e) => a + e.amount, 0);

    // Month-end projection based on pace so far
    const daysPassed = now.date();
    const daysInMonth = now.daysInMonth();
    const monthEndProjection = daysPassed > 0 ? (thisMonthTotal / daysPassed) * daysInMonth : 0;

    // Top category in YTD
    const catTotals = new Map<string, number>();
    for (const e of expenses) {
      if (dayjs(e.date.toDate()).year() === now.year()) {
        catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + e.amount);
      }
    }
    let topCat: string | null = null;
    let topCatAmt = 0;
    for (const [k, v] of catTotals) {
      if (v > topCatAmt) { topCat = k; topCatAmt = v; }
    }

    return {
      thisMonthTotal,
      lastMonthTotal,
      ytdTotal,
      monthEndProjection,
      topCat,
      topCatAmt,
      monthDelta: percentDelta(thisMonthTotal, lastMonthTotal),
    };
  }, [expenses]);

  // Monthly stacked bar: last 12 months, stacked by category
  const monthlyData = useMemo(() => {
    const now = dayjs();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      months.push(now.subtract(i, 'month').format('YYYY-MM'));
    }
    return months.map((ym) => {
      const datum: Record<string, string | number> = {
        month: dayjs(ym + '-01').format("MMM 'YY"),
      };
      for (const cat of Object.keys(CATEGORY_LABELS)) {
        datum[cat] = 0;
      }
      for (const e of expenses) {
        if (e.dateYYYYMM === ym) {
          datum[e.category] = (datum[e.category] as number) + e.amount / 100; // chart in dollars
        }
      }
      return datum;
    });
  }, [expenses]);

  // Category donut for current YTD
  const categoryData = useMemo(() => {
    const ytd = filterByWindow(expenses, 'ytd');
    const totals = new Map<string, number>();
    for (const e of ytd) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    return [...totals.entries()]
      .map(([cat, cents]) => ({
        name: CATEGORY_LABELS[cat] ?? cat,
        category: cat,
        value: cents / 100,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Who paid what, YTD
  const payerData = useMemo(() => {
    const ytd = filterByWindow(expenses, 'ytd');
    const totals = new Map<string, { name: string; cents: number }>();
    for (const e of ytd) {
      const cur = totals.get(e.paidByUid) ?? { name: e.paidByName, cents: 0 };
      cur.cents += e.amount;
      totals.set(e.paidByUid, cur);
    }
    return [...totals.values()]
      .map((t) => ({ name: t.name, amount: t.cents / 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
        No expenses yet. Add one on the List tab to see summaries here.
      </Typography>
    );
  }

  return (
    <Box>
      {/* Metric cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="This Month"
            value={formatCents(metrics.thisMonthTotal)}
            sublabel={dayjs().format('MMMM YYYY')}
            deltaPct={metrics.monthDelta}
            inverted // up = more spending = red arrow
            accentColor={CATEGORY_COLORS.medical}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Month-End Projection"
            value={formatCents(metrics.monthEndProjection)}
            sublabel={`Based on ${dayjs().date()} of ${dayjs().daysInMonth()} days`}
            accentColor={CATEGORY_COLORS.travel}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Year to Date"
            value={formatCents(metrics.ytdTotal)}
            sublabel={`${dayjs().year()}`}
            accentColor={CATEGORY_COLORS.professional_care}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Top Category (YTD)"
            value={metrics.topCat ? (CATEGORY_LABELS[metrics.topCat] ?? metrics.topCat) : '—'}
            sublabel={metrics.topCatAmt > 0 ? formatCents(metrics.topCatAmt) : 'No spending yet'}
            accentColor={metrics.topCat ? CATEGORY_COLORS[metrics.topCat] : undefined}
          />
        </Grid>
      </Grid>

      {/* Monthly stacked bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Monthly spend — last 12 months
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <RechartsTooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                <Bar key={cat} dataKey={cat} stackId="cat" fill={CATEGORY_COLORS[cat]} name={label} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category donut + Who paid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Category breakdown — YTD
              </Typography>
              {categoryData.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No spending this year yet.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                Who paid — YTD
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Helpful for reimbursement / cost-sharing conversations.
              </Typography>
              {payerData.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No expenses recorded yet.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, payerData.length * 44)}>
                  <BarChart data={payerData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                    <RechartsTooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                    <Bar dataKey="amount" fill="#3A7D44" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary footnote */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label={`${expenses.length} total expenses tracked`} variant="outlined" />
        <Chip size="small" label={`YTD total: ${formatCents(metrics.ytdTotal)}`} variant="outlined" />
      </Stack>
    </Box>
  );
}
