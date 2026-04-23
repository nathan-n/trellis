import { Grid, Box } from '@mui/material';
import { useCircle } from '../../contexts/CircleContext';
import { CircleRole } from '../../constants';
import MyNextPriorityCard from '../tasks/MyNextPriorityCard';
import TodaySpine from './TodaySpine';
import CircleHealthCard from './CircleHealthCard';

export default function DashboardPage() {
  const { role } = useCircle();
  const isAdmin = role === CircleRole.ADMIN;

  return (
    <Box>
      {/* Priority + wellbeing check-in — unchanged behavior */}
      <Box sx={{ mb: 4 }}>
        <MyNextPriorityCard />
      </Box>

      {/* Today's spine — replaces the earlier three snapshot cards with a
          single unified timeline of the day's care logs, visits, and my
          due tasks. Spine runs top-to-bottom; events string along it. */}
      <Box sx={{ mb: isAdmin ? 4 : 0 }}>
        <TodaySpine />
      </Box>

      {/* Row (admin only): circle-wide wellbeing signal. Expenses are
          intentionally NOT shown on the home dashboard — running spend
          totals on a caregiver's landing page are demoralizing. They live
          in the Expenses view where users can visit intentionally. */}
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
