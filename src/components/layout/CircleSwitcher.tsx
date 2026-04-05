import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { getCircle } from '../../services/circleService';
import type { Circle } from '../../types';

export default function CircleSwitcher() {
  const { userProfile } = useAuth();
  const { activeCircle, switchCircle } = useCircle();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    async function load() {
      if (!userProfile?.circleIds?.length) return;
      const results = await Promise.all(userProfile.circleIds.map((id) => getCircle(id)));
      setCircles(results.filter(Boolean) as Circle[]);
    }
    load();
  }, [userProfile?.circleIds]);

  const handleSwitch = async (circleId: string) => {
    await switchCircle(circleId);
    setAnchorEl(null);
  };

  if (!activeCircle) return null;

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<GroupIcon />}
        endIcon={<ArrowDropDownIcon />}
        sx={{ textTransform: 'none' }}
      >
        {activeCircle.name}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {circles.map((circle) => (
          <MenuItem
            key={circle.id}
            selected={circle.id === activeCircle.id}
            onClick={() => handleSwitch(circle.id)}
          >
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{circle.name}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/select-circle');
          }}
        >
          <ListItemIcon>
            <SwapHorizIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Circles</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
