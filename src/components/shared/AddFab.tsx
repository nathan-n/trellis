import { Fab, useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { ReactElement } from 'react';

interface AddFabProps {
  /** Action label — used as extended-FAB text on desktop and aria-label on mobile. */
  label: string;
  onClick: () => void;
  /** Visibility gate — typically a role/permission check. FAB renders nothing when false. */
  visible?: boolean;
  /** Override icon (defaults to AddIcon). */
  icon?: ReactElement;
}

/**
 * Persistent floating action button for the primary "add" action on a list
 * page. Extended (icon + label) on sm+, icon-only on mobile to reduce
 * visual weight. Fixed bottom-right. Use sparingly: only for pages where
 * the primary action is adding and the list can grow past a single screen.
 *
 * Pages using this: Tasks, Care Log (Day), Documents, Expenses (List).
 *
 * List containers that host an AddFab should add bottom padding so the
 * last list item isn't obscured on mobile (pb ~ 10 on the scroll region).
 */
export default function AddFab({ label, onClick, visible = true, icon }: AddFabProps) {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  if (!visible) return null;

  const sx = {
    position: 'fixed' as const,
    bottom: { xs: 20, sm: 24 },
    right: { xs: 20, sm: 24 },
    zIndex: (t: typeof theme) => t.zIndex.speedDial,
  };

  const iconEl = icon ?? <AddIcon />;

  if (isSmUp) {
    return (
      <Fab color="primary" variant="extended" onClick={onClick} sx={sx} aria-label={label}>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
          {iconEl}
        </span>
        {label}
      </Fab>
    );
  }

  return (
    <Fab color="primary" onClick={onClick} sx={sx} aria-label={label}>
      {iconEl}
    </Fab>
  );
}
