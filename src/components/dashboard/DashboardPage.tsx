import { Grid, Box } from '@mui/material';
import { useCircle } from '../../contexts/CircleContext';
import { CircleRole } from '../../constants';
import MyNextPriorityCard from '../tasks/MyNextPriorityCard';
import TodaySnapshotCard from './TodaySnapshotCard';
import MyTasksCard from './MyTasksCard';
import UpcomingVisitsCard from './UpcomingVisitsCard';
import CircleHealthCard from './CircleHealthCard';
import MonthSpendCard from './MonthSpendCard';

export default function DashboardPage() {
  const { role } = useCircle();
  const isAdmin = role === CircleRole.ADMIN;

  return (
    <Box>
      {/* Priority + wellbeing check-in — unchanged behavior */}
      <Box sx={{ mb: 3 }}>
        <MyNextPriorityCard />
      </Box>

      {/* Row 1: personal daily snapshot */}
      <Grid container spacing={2} sx={{ mb: isAdmin ? 3 : 0 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TodaySnapshotCard />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MyTasksCard />
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <UpcomingVisitsCard />
        </Grid>
      </Grid>

      {/* Row 2 (admin only): circle-wide insights */}
      {isAdmin && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CircleHealthCard />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <MonthSpendCard />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
