import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Divider } from '@mui/material';
import dayjs from 'dayjs';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useCircle } from '../../contexts/CircleContext';
import { fetchCareLogsPage } from '../../services/careLogService';
import type { CareLog } from '../../types';
import CareLogTimeline from './CareLogTimeline';
import CareLogFilterBar, { emptyFilters, type CareLogFilters } from './CareLogFilterBar';

const PAGE_SIZE = 30;

function matchesFilters(log: CareLog, f: CareLogFilters): boolean {
  if (f.mood && log.mood !== f.mood) return false;
  if (f.authorUid && log.authorUid !== f.authorUid) return false;
  if (f.handoffOnly && !log.isShiftHandoff) return false;
  if (f.text) {
    const q = f.text.toLowerCase();
    const haystack = [
      log.generalNotes ?? '',
      log.moodNotes ?? '',
      log.shiftSummary ?? '',
      log.authorName ?? '',
      ...(log.behaviors ?? []),
      ...(log.activities ?? []),
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function dayHeader(dateStr: string): string {
  const d = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const daysAgo = today.diff(d.startOf('day'), 'day');
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return d.format('dddd'); // e.g., "Monday"
  if (d.year() === today.year()) return d.format('dddd, MMM D'); // "Wednesday, Apr 9"
  return d.format('MMM D, YYYY');
}

interface Props {
  onDeleteRequest?: (log: CareLog) => void;
}

export default function CareLogHistoryView({ onDeleteRequest }: Props = {}) {
  const { activeCircle } = useCircle();
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filters, setFilters] = useState<CareLogFilters>(emptyFilters);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load a page. When called without args it uses the current cursor.
  const loadMore = useCallback(async () => {
    if (!activeCircle || loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await fetchCareLogsPage(activeCircle.id, PAGE_SIZE, cursor);
      setLogs((prev) => [...prev, ...page.logs]);
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [activeCircle, cursor, hasMore, loading]);

  // Reset + load first page when circle changes
  useEffect(() => {
    if (!activeCircle) return;
    setLogs([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const page = await fetchCareLogsPage(activeCircle.id, PAGE_SIZE, null);
        if (cancelled) return;
        setLogs(page.logs);
        setCursor(page.lastDoc);
        setHasMore(page.hasMore);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCircle?.id]);

  // Infinite scroll via IntersectionObserver on a sentinel div
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || initialLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, initialLoading, loadMore]);

  const filteredLogs = useMemo(() => logs.filter((l) => matchesFilters(l, filters)), [logs, filters]);

  // Group filtered logs by logDate (already YYYY-MM-DD on the doc)
  const grouped = useMemo(() => {
    const map = new Map<string, CareLog[]>();
    for (const log of filteredLogs) {
      const key = log.logDate;
      const arr = map.get(key) ?? [];
      arr.push(log);
      map.set(key, arr);
    }
    // Map preserves insertion order; logs were already desc-ordered by timestamp
    return [...map.entries()];
  }, [filteredLogs]);

  // Unique authors from loaded logs (for author filter dropdown)
  const authors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of logs) {
      if (!seen.has(log.authorUid)) seen.set(log.authorUid, log.authorName);
    }
    return [...seen.entries()].map(([uid, name]) => ({ uid, name }));
  }, [logs]);

  const activeFilterCount =
    (filters.text ? 1 : 0) +
    (filters.mood ? 1 : 0) +
    (filters.authorUid ? 1 : 0) +
    (filters.handoffOnly ? 1 : 0);

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (logs.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No care log entries yet. Add one from the "Day" tab.
      </Typography>
    );
  }

  return (
    <Box>
      <CareLogFilterBar filters={filters} onChange={setFilters} authors={authors} />

      {activeFilterCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {filteredLogs.length} of {logs.length} loaded entr{logs.length === 1 ? 'y' : 'ies'} match
          {hasMore && ' — scroll down to load older entries'}
        </Typography>
      )}

      {filteredLogs.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No entries match these filters{hasMore ? '. Scroll to load more, or clear filters.' : '.'}
        </Typography>
      ) : (
        <Box>
          {grouped.map(([dateStr, dayLogs]) => (
            <Box key={dateStr} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  position: 'sticky',
                  top: 64, // clear the AppBar
                  bgcolor: 'background.default',
                  zIndex: 2,
                  py: 0.5,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {dayHeader(dateStr)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(dateStr).format('MMM D, YYYY')}
                </Typography>
                <Divider sx={{ flex: 1, ml: 1 }} />
              </Box>
              <CareLogTimeline logs={dayLogs} onDelete={onDeleteRequest} />
            </Box>
          ))}
        </Box>
      )}

      {/* Infinite scroll sentinel + fallback button */}
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        {loading && <CircularProgress size={24} />}
        {!loading && hasMore && (
          <Button onClick={loadMore} size="small" variant="text">
            Load older entries
          </Button>
        )}
        {!hasMore && logs.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            End of history
          </Typography>
        )}
      </Box>
    </Box>
  );
}
