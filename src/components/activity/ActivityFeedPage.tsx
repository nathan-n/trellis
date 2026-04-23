import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import EventIcon from '@mui/icons-material/EventOutlined';
import MedicationIcon from '@mui/icons-material/MedicationOutlined';
import NoteAltIcon from '@mui/icons-material/NoteAltOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCircle } from '../../contexts/CircleContext';
import { formatDateTime } from '../../utils/dateUtils';
import type { AuditLogEntry } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';
import PageHeader from '../shared/PageHeader';
import dayjs from 'dayjs';
import { useMemo } from 'react';

const FEED_LIMIT = 50;

const actionConfig: Record<string, { icon: React.ReactElement; color: string; label: (details: Record<string, unknown>) => string }> = {
  'task.create': {
    icon: <TaskAltIcon fontSize="small" />,
    color: '#2e7d32',
    label: (d) => `created task "${d.title ?? 'Untitled'}"${d.recurringNext ? ' (recurring next)' : ''}`,
  },
  'task.update': {
    icon: <TaskAltIcon fontSize="small" />,
    color: '#1976d2',
    label: () => 'updated a task',
  },
  'task.complete': {
    icon: <CheckCircleIcon fontSize="small" />,
    color: '#388e3c',
    label: (d) => `completed task "${d.title ?? ''}"${d.recurring ? ' (recurring)' : ''}`,
  },
  'task.delete': {
    icon: <TaskAltIcon fontSize="small" />,
    color: '#d32f2f',
    label: () => 'deleted a task',
  },
  'visit.create': {
    icon: <EventIcon fontSize="small" />,
    color: '#7b1fa2',
    label: (d) => `scheduled a visit${d.caregiverName ? ` for ${d.caregiverName}` : ''}`,
  },
  'visit.update': {
    icon: <EventIcon fontSize="small" />,
    color: '#7b1fa2',
    label: () => 'updated a visit',
  },
  'visit.delete': {
    icon: <EventIcon fontSize="small" />,
    color: '#d32f2f',
    label: () => 'deleted a visit',
  },
  'medication.create': {
    icon: <MedicationIcon fontSize="small" />,
    color: '#0097a7',
    label: (d) => `added medication "${d.name ?? ''}"`,
  },
  'medication.update': {
    icon: <MedicationIcon fontSize="small" />,
    color: '#0097a7',
    label: () => 'updated a medication',
  },
  'medication.delete': {
    icon: <MedicationIcon fontSize="small" />,
    color: '#d32f2f',
    label: () => 'removed a medication',
  },
  'careLog.create': {
    icon: <NoteAltIcon fontSize="small" />,
    color: '#f57c00',
    label: (d) => `logged a care entry${d.logDate ? ` for ${d.logDate}` : ''}`,
  },
  'document.upload': {
    icon: <FolderIcon fontSize="small" />,
    color: '#5d4037',
    label: (d) => `uploaded document "${d.title ?? d.fileName ?? ''}"`,
  },
  'document.delete': {
    icon: <FolderIcon fontSize="small" />,
    color: '#d32f2f',
    label: (d) => `removed document "${d.title ?? ''}"`,
  },
  'member.invite': {
    icon: <PersonAddIcon fontSize="small" />,
    color: '#455a64',
    label: () => 'invited a new member',
  },
};

function getActionInfo(entry: AuditLogEntry) {
  const config = actionConfig[entry.action];
  if (config) {
    return {
      icon: config.icon,
      color: config.color,
      text: config.label(entry.details),
    };
  }
  return {
    icon: <TaskAltIcon fontSize="small" />,
    color: '#666',
    text: entry.action.replace('.', ' '),
  };
}

export default function ActivityFeedPage() {
  const { activeCircle } = useCircle();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle) return;
    const q = query(
      collection(db, 'circles', activeCircle.id, 'auditLog'),
      orderBy('timestamp', 'desc'),
      limit(FEED_LIMIT)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry));
        setLoading(false);
      },
      (err) => {
        console.error('Activity feed error:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  // Dynamic overline — count of actions today + most recent entry age.
  const headerOverline = useMemo(() => {
    if (entries.length === 0) return 'No activity yet';
    const startToday = dayjs().startOf('day');
    const todayCount = entries.filter(
      (e) => e.timestamp?.toDate && dayjs(e.timestamp.toDate()).isAfter(startToday)
    ).length;
    const latest = entries[0]; // already sorted desc by service
    const latestAt = latest?.timestamp?.toDate?.();
    if (!latestAt) return `${entries.length} entries`;
    // eslint-disable-next-line react-hooks/purity -- recency is snapshot-at-mount; fine to not update while page stays open
    const diffMin = Math.floor((Date.now() - latestAt.getTime()) / 60000);
    const recency = diffMin < 60
      ? `${diffMin}m ago`
      : diffMin < 60 * 24
        ? `${Math.floor(diffMin / 60)}h ago`
        : `${Math.floor(diffMin / 60 / 24)}d ago`;
    return todayCount > 0
      ? `${todayCount} today · last ${recency}`
      : `${entries.length} entries · last ${recency}`;
  }, [entries]);

  if (loading) return <LoadingSpinner />;

  if (entries.length === 0) {
    return (
      <Box>
        <PageHeader overline={headerOverline} title="Activity" />
        <EmptyState title="No activity yet" description="Actions taken in this circle will appear here." />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader overline={headerOverline} title="Activity" />
      <Stack spacing={1}>
        {entries.map((entry) => {
          const info = getActionInfo(entry);
          return (
            <Card key={entry.id} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: info.color }}>
                  {info.icon}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2">
                    <strong>{entry.actorName}</strong> {info.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(entry.timestamp)}
                  </Typography>
                </Box>
                <Chip label={entry.resourceType} size="small" variant="outlined" sx={{ display: { xs: 'none', sm: 'flex' } }} />
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
