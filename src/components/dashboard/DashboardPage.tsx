import { Grid, Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useCircle } from '../../contexts/CircleContext';
import { CircleRole } from '../../constants';
import MyNextPriorityCard from '../tasks/MyNextPriorityCard';
import TodaySpine from './TodaySpine';
import CircleHealthCard from './CircleHealthCard';

// Page now titled "Today" (review finding 02). "My Next Priority" and
// "Your rhythm" are section headings beneath it, not the page's identity.
export default function DashboardPage() {
  const { role } = useCircle();
  const isAdmin = role === CircleRole.ADMIN;
  const humanDate = dayjs().format('dddd, MMMM D');

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
          {humanDate}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1.2 }}>
          Today
        </Typography>
      </Box>

      {/* Priority + wellbeing check-in — section, no longer the page identity */}
      <Box sx={{ mb: 4 }}>
        <MyNextPriorityCard />
      </Box>

      {/* Today's spine */}
      <Box sx={{ mb: isAdmin ? 4 : 0 }}>
        <TodaySpine />
      </Box>

      {/* Admin: circle-wide wellbeing. Expenses are intentionally NOT shown
          on the home dashboard — running spend totals on a caregiver's
          landing page are demoralizing. They live in the Expenses view
          where users can visit intentionally. */}
      {isAdmin && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CircleHealthCard />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
