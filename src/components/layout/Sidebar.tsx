import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Badge,
} from '@mui/material';
// Direction C icons — outlined variants. Import variable names unchanged
// so render sites don't need updates; only the source module swaps.
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventIcon from '@mui/icons-material/EventOutlined';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import MedicationIcon from '@mui/icons-material/MedicationOutlined';
import NoteAltIcon from '@mui/icons-material/NoteAltOutlined';
import EmergencyIcon from '@mui/icons-material/LocalHospitalOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import SummarizeIcon from '@mui/icons-material/SummarizeOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
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
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Today', path: '/my-next', icon: <PriorityHighIcon />, section: 'overview' },
  { label: 'Activity', path: '/activity', icon: <TimelineIcon />, section: 'overview' },
  { label: 'Tasks', path: '/tasks', icon: <TaskAltIcon />, section: 'manage' },
  { label: 'Calendar', path: '/tasks/calendar', icon: <CalendarMonthIcon />, section: 'manage' },
  { label: 'Visits', path: '/visits', icon: <EventIcon />, section: 'manage' },
  { label: 'Medications', path: '/medications', icon: <MedicationIcon />, section: 'care' },
  { label: 'Care log', path: '/care-log', icon: <NoteAltIcon />, section: 'care' },
  { label: 'Emergency info', path: '/emergency', icon: <EmergencyIcon />, section: 'care' },
  { label: 'Doctor visits', path: '/doctor-prep', icon: <SummarizeIcon />, section: 'care' },
  { label: 'Documents', path: '/documents', icon: <FolderIcon />, section: 'resources' },
  { label: 'Resources', path: '/resources', icon: <MenuBookIcon />, section: 'resources' },
  { label: 'Expenses', path: '/expenses', icon: <ReceiptLongIcon />, section: 'resources' },
  { label: 'My wellbeing', path: '/wellbeing', icon: <FavoriteIcon />, section: 'you' },
];

const adminItems: NavItem[] = [
  { label: 'Settings', path: '/circle/settings', icon: <SettingsIcon />, minRole: CircleRole.ADMIN },
];

const sectionLabels: Record<string, string> = {
  overview: 'Overview',
  manage: 'Coordinate',
  care: 'Care',
  resources: 'Reference',
  you: 'You',
};

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

  // Group items by section
  const sections = ['overview', 'manage', 'care', 'resources', 'you'];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo — uses theme h5 (Fraunces opsz 24, SOFT 80) so the wordmark
          reads in the same typeface as every other serif surface. */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="h5" sx={{ color: 'primary.main' }}>
          Trellis
        </Typography>
        {activeCircle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {activeCircle.patientName}
          </Typography>
        )}
      </Box>

      {/* Navigation sections */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section);
          if (items.length === 0) return null;
          return (
            <Box key={section} sx={{ mb: 1 }}>
              {/* Section label uses theme-styled overline (mono, plum,
                  0.14em tracking). No inline overrides — keeps the
                  brand's single canonical overline style. */}
              <Typography
                variant="overline"
                sx={{ px: 1.5, py: 0.5, display: 'block' }}
              >
                {sectionLabels[section]}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <ListItem key={item.path} disablePadding sx={{ px: 0.5 }}>
                      <ListItemButton
                        onClick={() => handleNav(item.path)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.25,
                          py: 0.75,
                          bgcolor: isActive ? 'primary.main' : 'transparent',
                          color: isActive ? 'white' : 'text.primary',
                          '&:hover': {
                            bgcolor: isActive ? 'primary.dark' : 'action.hover',
                          },
                          '& .MuiListItemIcon-root': {
                            color: isActive ? 'white' : 'text.secondary',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {item.path === '/tasks' && unseenTaskCount > 0 ? (
                            <Badge badgeContent={unseenTaskCount} color="info" max={99}>
                              {item.icon}
                            </Badge>
                          ) : item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Admin section at bottom */}
      {adminItems
        .filter((item) => !item.minRole || (role && hasMinRole(role, item.minRole)))
        .length > 0 && (
        <Box sx={{ px: 1, pb: 1.5, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          <List dense disablePadding>
            {adminItems
              .filter((item) => !item.minRole || (role && hasMinRole(role, item.minRole)))
              .map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <ListItem key={item.path} disablePadding sx={{ px: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleNav(item.path)}
                      sx={{
                        borderRadius: 2,
                        py: 0.75,
                        bgcolor: isActive ? 'primary.main' : 'transparent',
                        color: isActive ? 'white' : 'text.secondary',
                        '&:hover': { bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                        '& .MuiListItemIcon-root': { color: isActive ? 'white' : 'text.secondary' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400 }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
          </List>
        </Box>
      )}
    </Box>
  );

  const drawerPaperSx = {
    width: SIDEBAR_WIDTH,
    boxSizing: 'border-box' as const,
    bgcolor: 'background.paper',
    borderRight: 1,
    borderColor: 'divider',
  };

  return (
    <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
