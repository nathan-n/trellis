import { AppBar, Toolbar, IconButton, Avatar, Box, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_WIDTH } from '../../constants';
import CircleSwitcher from './CircleSwitcher';

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { userProfile, logOut } = useAuth();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { md: `${SIDEBAR_WIDTH}px` },
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          onClick={onMenuToggle}
          sx={{ mr: 1, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <CircleSwitcher />

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              display: { xs: 'none', sm: 'block' },
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            {userProfile?.displayName}
          </Typography>
          <Avatar
            src={userProfile?.photoURL || undefined}
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'primary.main',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {userProfile?.displayName?.[0]?.toUpperCase()}
          </Avatar>
          <Tooltip title="Sign out">
            <IconButton onClick={logOut} size="small" sx={{ color: 'text.secondary' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
