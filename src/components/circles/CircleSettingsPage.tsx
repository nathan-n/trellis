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
import CancelIcon from '@mui/icons-material/Cancel';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useCircle } from '../../contexts/CircleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  getCircleMembers,
  updateMemberRole,
  removeMember,
  getCircleInvitations,
  revokeInvitation,
} from '../../services/circleService';
import { CircleRole, InvitationStatus } from '../../constants';
import { getRoleLabel } from '../../utils/roleUtils';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import type { CircleMember, Invitation } from '../../types';
import InviteDialog from './InviteDialog';

const inviteStatusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'default' | 'error' }> = {
  pending: { label: 'Pending', color: 'warning' },
  accepted: { label: 'Accepted', color: 'success' },
  declined: { label: 'Declined', color: 'default' },
  expired: { label: 'Revoked', color: 'error' },
};

function formatLastActive(ts: { toDate: () => Date } | null): string {
  if (!ts) return 'Never';
  const date = ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(ts as Parameters<typeof formatDate>[0]);
}

export default function CircleSettingsPage() {
  const { activeCircle, role } = useCircle();
  const { firebaseUser } = useAuth();
  const { showMessage } = useSnackbar();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);

  const isAdmin = role === CircleRole.ADMIN;

  useEffect(() => {
    if (activeCircle) {
      getCircleMembers(activeCircle.id).then(setMembers);
      getCircleInvitations(activeCircle.id).then(setInvitations);
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

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation(invitationId);
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId ? { ...inv, status: InvitationStatus.EXPIRED as Invitation['status'] } : inv
        )
      );
      showMessage('Invitation revoked', 'success');
    } catch {
      showMessage('Failed to revoke invitation', 'error');
    }
  };

  const handleInviteClose = () => {
    setInviteOpen(false);
    // Refresh invitations after closing the dialog
    if (activeCircle) {
      getCircleInvitations(activeCircle.id).then(setInvitations);
    }
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

      {/* Members */}
      <Card sx={{ mb: 3 }}>
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
                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{member.email} — {getRoleLabel(member.role)}</span>
                      <Typography variant="caption" color="text.secondary" component="span">
                        Last active: {formatLastActive(member.lastActiveAt)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Invitations */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Invitations ({invitations.length})</Typography>
          <Divider />
          {invitations.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No invitations sent yet.
            </Typography>
          ) : (
            <List>
              {invitations.map((inv) => {
                const config = inviteStatusConfig[inv.status] ?? { label: inv.status, color: 'default' as const };
                return (
                  <ListItem
                    key={inv.id}
                    secondaryAction={
                      isAdmin && inv.status === InvitationStatus.PENDING ? (
                        <IconButton color="error" onClick={() => handleRevoke(inv.id)} title="Revoke invitation">
                          <CancelIcon />
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'action.selected' }}>
                        <MailOutlineIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {inv.inviteeEmail}
                          <Chip label={config.label} size="small" color={config.color} />
                          <Chip label={getRoleLabel(inv.role)} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={
                        <>
                          Invited by {inv.invitedByName} — {formatDateTime(inv.createdAt)}
                          {inv.status === InvitationStatus.PENDING && inv.expiresAt && (
                            <> — Expires {formatDate(inv.expiresAt)}</>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
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

      <InviteDialog open={inviteOpen} onClose={handleInviteClose} />
    </Box>
  );
}
