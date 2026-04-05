import { Box, Typography, Card, CardContent } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

export default function MyNextPriorityCard() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        My Next Priority
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <PriorityHighIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No priority items assigned to you
          </Typography>
          <Typography color="text.secondary">
            Tasks assigned to you will appear here, sorted by priority.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
