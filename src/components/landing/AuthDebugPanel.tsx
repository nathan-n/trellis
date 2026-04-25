import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, Button } from '@mui/material';
import { auth, RESOLVED_AUTH_DOMAIN } from '../../config/firebase';
import { getRedirectResult } from 'firebase/auth';

/**
 * AuthDebugPanel — visible diagnostic information for sign-in issues.
 *
 * Mount on the landing page when `?debug=1` is in the URL. The user
 * can read this off their phone and report what they see, which is
 * miles easier than trying to inspect a mobile browser console.
 *
 * Captures:
 *   - Origin + authDomain (mismatch is the #1 cause of mobile failure)
 *   - Standalone PWA flag, mobile UA detection
 *   - Current Firebase auth user (or null)
 *   - Last getRedirectResult outcome
 *   - Storage availability (cookies, IndexedDB, sessionStorage)
 *   - Service worker registration count
 *   - Detected OAuth/redirect issues
 */
interface DebugState {
  origin: string;
  authDomain: string;
  domainMatch: boolean;
  isStandalone: boolean;
  isIosStandalone: boolean;
  isMobileUA: boolean;
  userAgent: string;
  authUser: string;
  redirectResult: string;
  cookiesEnabled: boolean;
  hasIndexedDB: boolean;
  hasSessionStorage: boolean;
  swCount: number;
  swController: string;
}

// Hoisted out of the render function — defining components inline in a
// parent's render breaks reconciliation and is flagged by react-hooks/
// rules-of-hooks. Must be a top-level component.
function Row({ label, value, ok }: { label: string; value: string | boolean; ok?: boolean }) {
  const display = typeof value === 'boolean' ? (value ? 'yes' : 'no') : value;
  const status = ok === undefined ? null : ok ? 'ok' : 'fail';
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 140, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
        {label}:
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          wordBreak: 'break-all',
          flex: 1,
        }}
      >
        {display}
      </Typography>
      {status && (
        <Chip
          label={status}
          size="small"
          sx={{
            height: 16,
            fontSize: '0.55rem',
            ...(ok
              ? { bgcolor: 'primary.light', color: 'primary.dark' }
              : { bgcolor: 'clay.light', color: 'clay.dark' }),
          }}
        />
      )}
    </Box>
  );
}

export default function AuthDebugPanel() {
  const [state, setState] = useState<DebugState | null>(null);

  useEffect(() => {
    async function gather() {
      const origin = window.location.origin;
      const authDomain = RESOLVED_AUTH_DOMAIN;
      const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
      const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Storage probes — auth depends on these
      const cookiesEnabled = navigator.cookieEnabled;
      const hasIndexedDB = (() => {
        try { return Boolean(window.indexedDB); } catch { return false; }
      })();
      const hasSessionStorage = (() => {
        try {
          window.sessionStorage.setItem('__t', '1');
          window.sessionStorage.removeItem('__t');
          return true;
        } catch { return false; }
      })();

      // Service worker visibility
      let swCount = 0;
      let swController = 'none';
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          swCount = regs.length;
          if (navigator.serviceWorker.controller) {
            swController = new URL(navigator.serviceWorker.controller.scriptURL).pathname;
          }
        }
      } catch { /* best-effort */ }

      // Try the redirect result — surfaces redirect-flow errors that
      // would otherwise be invisible.
      let redirectResult = 'pending';
      try {
        const result = await getRedirectResult(auth);
        redirectResult = result ? `user: ${result.user.email}` : 'null (no pending redirect)';
      } catch (err) {
        const e = err as { code?: string; message?: string };
        redirectResult = `error: ${e.code ?? e.message ?? 'unknown'}`;
      }

      const authUser = auth.currentUser
        ? `${auth.currentUser.email} (${auth.currentUser.uid.slice(0, 8)}…)`
        : 'null';

      const appDomain = origin.replace(/^https?:\/\//, '');
      const domainMatch = appDomain === authDomain;

      setState({
        origin,
        authDomain,
        domainMatch,
        isStandalone,
        isIosStandalone,
        isMobileUA,
        userAgent: navigator.userAgent,
        authUser,
        redirectResult,
        cookiesEnabled,
        hasIndexedDB,
        hasSessionStorage,
        swCount,
        swController,
      });
    }
    gather();
  }, []);

  if (!state) {
    return (
      <Card sx={{ mt: 3, mx: 'auto', maxWidth: 720 }}>
        <CardContent>
          <Typography>Loading diagnostics…</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 3, mx: 'auto', maxWidth: 720, border: 2, borderColor: state.domainMatch ? 'primary.main' : 'clay.main' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Auth Diagnostics
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Read this off your phone if sign-in is failing. Domain mismatch is the most
          common cause — app + authDomain must be the same origin for OAuth to work
          on Android Chrome and Safari.
        </Typography>
        <Stack spacing={1}>
          <Row label="origin" value={state.origin} />
          <Row label="authDomain" value={state.authDomain} ok={state.domainMatch} />
          <Row label="standalone PWA" value={state.isStandalone || state.isIosStandalone} />
          <Row label="mobile UA" value={state.isMobileUA} />
          <Row label="cookies enabled" value={state.cookiesEnabled} ok={state.cookiesEnabled} />
          <Row label="indexedDB" value={state.hasIndexedDB} ok={state.hasIndexedDB} />
          <Row label="sessionStorage" value={state.hasSessionStorage} ok={state.hasSessionStorage} />
          <Row label="auth.currentUser" value={state.authUser} />
          <Row label="redirect result" value={state.redirectResult} />
          <Row label="SW registrations" value={String(state.swCount)} />
          <Row label="SW controller" value={state.swController} />
          <Row label="userAgent" value={state.userAgent.slice(0, 90) + (state.userAgent.length > 90 ? '…' : '')} />
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              window.location.reload();
            }}
            sx={{ mr: 1 }}
          >
            Reset SW + Caches
          </Button>
          <Button size="small" variant="outlined" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
