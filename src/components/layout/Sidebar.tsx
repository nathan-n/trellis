import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
  Badge,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import MedicationIcon from '@mui/icons-material/Medication';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import EmergencyIcon from '@mui/icons-material/LocalHospital';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FolderIcon from '@mui/icons-material/Folder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import { SIDEBAR_WIDTH, CircleRole } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useTasks } from '../../hooks/useTasks';
import { useTaskViewed } from '../../hooks/useTaskViewed';
import { hasMinRole } from '../../utils/roleUtils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  minRole?: CircleRole;
}

const navItems: NavItem[] = [
  { label: 'My Next Priority', path: '/my-next', icon: <PriorityHighIcon /> },
  { label: 'Tasks', path: '/tasks', icon: <TaskAltIcon /> },
  { label: 'Task Calendar', path: '/tasks/calendar', icon: <CalendarMonthIcon /> },
  { label: 'Visit Schedule', path: '/visits', icon: <EventIcon /> },
  { label: 'Medications', path: '/medications', icon: <MedicationIcon /> },
  { label: 'Care Log', path: '/care-log', icon: <NoteAltIcon /> },
  { label: 'Emergency Info', path: '/emergency', icon: <EmergencyIcon /> },
  { label: 'Documents', path: '/documents', icon: <FolderIcon /> },
  { label: 'Resources', path: '/resources', icon: <MenuBookIcon /> },
  { label: 'Expenses', path: '/expenses', icon: <ReceiptLongIcon /> },
  { label: 'Doctor Prep', path: '/doctor-prep', icon: <SummarizeIcon /> },
  { label: 'Activity', path: '/activity', icon: <TimelineIcon /> },
  { label: 'My Wellbeing', path: '/wellbeing', icon: <FavoriteIcon /> },
];

const adminItems: NavItem[] = [
  { label: 'Circle Settings', path: '/circle/settings', icon: <SettingsIcon />, minRole: CircleRole.ADMIN },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCircle, role } = useCircle();
  const { userProfile } = useAuth();
  const { tasks } = useTasks();
  const { getUnseenCount } = useTaskViewed(activeCircle?.id, userProfile?.uid);
  const unseenTaskCount = getUnseenCount(tasks);

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h5" fontWeight={700} color="primary">
          Trellis
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNav(item.path)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.path === '/tasks' && unseenTaskCount > 0 ? (
                  <Badge badgeContent={unseenTaskCount} color="info" max={99}>{item.icon}</Badge>
                ) : item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {adminItems
          .filter((item) => !item.minRole || (role && hasMinRole(role, item.minRole)))
          .map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNav(item.path)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
