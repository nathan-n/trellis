import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, Button } from '@mui/material';
import { auth, RESOLVED_AUTH_DOMAIN } from '../../config/firebase';
import { getRedirectResult } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';

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
  const { signIn } = useAuth();
  const [state, setState] = useState<DebugState | null>(null);
  // Captures the result of the in-panel "Test Sign In" button so we
  // can show the error code inline — no toast to miss, no scrolling
  // through the marketing page to find the real sign-in button.
  const [signInResult, setSignInResult] = useState<string>('not attempted');
  // Click counter proves the onClick is firing at all. If the user taps
  // and this stays at 0, the click never registered (CSS blocking,
  // wrong bundle, etc.).
  const [clickCount, setClickCount] = useState<number>(0);
  // In-panel event log so we don't rely on the user catching
  // ephemeral toasts. Appends timestamped lines for every step.
  const [events, setEvents] = useState<string[]>([]);
  const log = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setEvents((prev) => [...prev, `${ts} — ${msg}`].slice(-12));
    console.log(`[debug] ${msg}`);
  };

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

      setState({
        origin,
        authDomain,
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
    <Card sx={{ mt: 3, mx: 'auto', maxWidth: 720, border: 2, borderColor: 'primary.main' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Auth Diagnostics
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Read this off your phone if sign-in is failing. After tapping Test Sign In,
          the event log below will show what happened — error code, navigation, or
          a stuck state — without needing DevTools.
        </Typography>
        <Stack spacing={1}>
          <Row label="origin" value={state.origin} />
          <Row label="authDomain" value={state.authDomain} />
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
          <Row label="signIn() result" value={signInResult} />
          <Row label="click count" value={String(clickCount)} />
        </Stack>

        {/* Event log — surfaces what's actually happening since the
            user can't open DevTools easily on a phone. The Test Sign
            In flow logs every step here so we can see whether the
            click registered, signIn was called, signInWithRedirect
            was reached, and whether it threw or navigated. */}
        {events.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, monospace', display: 'block', mb: 0.5 }}>
              event log
            </Typography>
            {events.map((e, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{ display: 'block', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: '0.65rem' }}
              >
                {e}
              </Typography>
            ))}
          </Box>
        )}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {/* Test Sign In: invokes signIn directly so any synchronous
              error gets captured inline. If signInWithRedirect navigates
              successfully, the page will leave for Google and this
              button never returns. If it errors, we show the code. */}
          <Button
            size="small"
            variant="contained"
            onClick={async () => {
              // Log first thing so we know the click registered even
              // if everything downstream throws.
              setClickCount((c) => c + 1);
              log('Test Sign In clicked');
              setSignInResult('calling signIn()…');
              log(`signIn function: ${typeof signIn}`);
              try {
                log('about to call signIn()');
                await signIn();
                // Popup mode: resolves successfully when popup auth
                // completes — this is the SUCCESS path on desktop.
                // Redirect mode: navigates the page, so we'd never
                // reach this line. So "returned" = success on popup
                // OR a no-op call on redirect.
                const u = auth.currentUser;
                if (u) {
                  log(`signIn() succeeded — user: ${u.email}`);
                  setSignInResult(`success — signed in as ${u.email}`);
                } else {
                  log('signIn() returned but auth.currentUser is null');
                  setSignInResult('returned with no current user (popup may have closed before completing)');
                }
              } catch (err) {
                const e = err as { code?: string; message?: string };
                log(`signIn() threw: ${e.code ?? 'no-code'} ${e.message ?? String(err)}`);
                setSignInResult(`error: ${e.code ?? 'unknown'} — ${e.message ?? String(err)}`);
              }
            }}
          >
            Test Sign In
          </Button>
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
