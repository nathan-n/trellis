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
      color="default"
      elevation={1}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { md: `${SIDEBAR_WIDTH}px` },
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          onClick={onMenuToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <CircleSwitcher />

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {userProfile?.displayName}
          </Typography>
          <Avatar
            src={userProfile?.photoURL || undefined}
            sx={{ width: 32, height: 32 }}
          >
            {userProfile?.displayName?.[0]?.toUpperCase()}
          </Avatar>
          <Tooltip title="Sign out">
            <IconButton onClick={logOut} size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
