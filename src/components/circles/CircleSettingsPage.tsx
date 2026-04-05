import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  Button,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useCircle } from '../../contexts/CircleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { getCircleMembers, updateMemberRole, removeMember } from '../../services/circleService';
import { CircleRole } from '../../constants';
import { getRoleLabel } from '../../utils/roleUtils';
import type { CircleMember } from '../../types';
import InviteDialog from './InviteDialog';

export default function CircleSettingsPage() {
  const { activeCircle, role } = useCircle();
  const { firebaseUser } = useAuth();
  const { showMessage } = useSnackbar();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);

  const isAdmin = role === CircleRole.ADMIN;

  useEffect(() => {
    if (activeCircle) {
      getCircleMembers(activeCircle.id).then(setMembers);
    }
  }, [activeCircle]);

  const handleRoleChange = async (memberId: string, newRole: CircleRole) => {
    if (!activeCircle) return;
    try {
      await updateMemberRole(activeCircle.id, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.uid === memberId ? { ...m, role: newRole } : m))
      );
      showMessage('Role updated', 'success');
    } catch {
      showMessage('Failed to update role', 'error');
    }
    setMenuAnchor(null);
  };

  const handleRemove = async (memberId: string) => {
    if (!activeCircle) return;
    try {
      await removeMember(activeCircle.id, memberId);
      setMembers((prev) => prev.filter((m) => m.uid !== memberId));
      showMessage('Member removed', 'success');
    } catch {
      showMessage('Failed to remove member', 'error');
    }
    setMenuAnchor(null);
  };

  if (!activeCircle) return null;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Circle Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {activeCircle.name} — Caring for {activeCircle.patientName}
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Members ({members.length})</Typography>
            {isAdmin && (
              <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={() => setInviteOpen(true)}>
                Invite
              </Button>
            )}
          </Box>
          <Divider />
          <List>
            {members.map((member) => (
              <ListItem
                key={member.uid}
                secondaryAction={
                  isAdmin && member.uid !== firebaseUser?.uid ? (
                    <IconButton
                      onClick={(e) => {
                        setSelectedMember(member);
                        setMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  ) : undefined
                }
              >
                <ListItemAvatar>
                  <Avatar src={member.photoURL || undefined}>
                    {member.displayName?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {member.displayName}
                      {member.uid === firebaseUser?.uid && (
                        <Chip label="You" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {member.email} — {getRoleLabel(member.role)}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Change Role
          </Typography>
        </MenuItem>
        {Object.values(CircleRole).map((r) => (
          <MenuItem
            key={r}
            selected={selectedMember?.role === r}
            onClick={() => selectedMember && handleRoleChange(selectedMember.uid, r)}
          >
            {getRoleLabel(r)}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => selectedMember && handleRemove(selectedMember.uid)}
          sx={{ color: 'error.main' }}
        >
          Remove from Circle
        </MenuItem>
      </Menu>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </Box>
  );
}
