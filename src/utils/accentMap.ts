import type { SxProps, Theme } from '@mui/material/styles';

// Trellis accent color map (Direction C).
//
// The canonical mapping, per the April 2026 design review (finding 03):
//
//   clay  = urgent / emergency     (warm terracotta; reads alarm without
//                                   the MUI-red clinical siren)
//   ochre = upcoming / scheduled   (warm gold; treats "soon" as anticipation,
//                                   not warning)
//   slate = reference / reports    (muted blue-grey; bookkeeping tone)
//   rose  = wellbeing / personal   (muted dusty pink; body & care tone)
//   green = confirmed / done       (primary.main; completion)
//   plum  = secondary / recurring  (secondary.main; continuity)
//
// These helpers return sx-ready tinted-chip styles so every consumer
// site (priority chips, doc category chips, visit status chips, etc.)
// uses the same visual language without hand-rolling.

export type AccentKind = 'clay' | 'ochre' | 'slate' | 'rose' | 'green' | 'plum';

/** Tinted-chip style: `*.light` background with `*.dark` text.
 *  Usage: `<Chip label="..." sx={accentChipSx('clay')} />` */
export function accentChipSx(kind: AccentKind): SxProps<Theme> {
  const token = kind === 'green' ? 'primary' : kind === 'plum' ? 'secondary' : kind;
  return {
    bgcolor: `${token}.light`,
    color: `${token}.dark`,
    fontWeight: 500,
    border: 'none',
  };
}

/** Solid accent pill — filled bg, white text. Use sparingly. */
export function accentFilledSx(kind: AccentKind): SxProps<Theme> {
  const token = kind === 'green' ? 'primary' : kind === 'plum' ? 'secondary' : kind;
  return {
    bgcolor: `${token}.main`,
    color: 'white',
    fontWeight: 600,
    border: 'none',
  };
}

// ─── Task priority ──────────────────────────────────────────────────────────
// Review finding 03: urgent = clay (was error), high = ochre (was warning),
// medium = slate (was info), low = default.

export function priorityAccent(priority: string): AccentKind | 'default' {
  switch (priority) {
    case 'urgent': return 'clay';
    case 'high': return 'ochre';
    case 'medium': return 'slate';
    case 'low':
    default: return 'default';
  }
}

export function priorityChipSx(priority: string): SxProps<Theme> {
  const kind = priorityAccent(priority);
  if (kind === 'default') return { fontWeight: 500 };
  return accentChipSx(kind);
}

// ─── Document category ──────────────────────────────────────────────────────
// Mapping per the approved categorical scheme:
//   medical → rose (health)
//   legal → slate (reference)
//   insurance → ochre (policies renew)
//   identification → plum (secondary)
//   other → default

export function documentCategoryAccent(category: string): AccentKind | 'default' {
  switch (category) {
    case 'medical': return 'rose';
    case 'legal': return 'slate';
    case 'insurance': return 'ochre';
    case 'identification': return 'plum';
    case 'other':
    default: return 'default';
  }
}

export function documentCategoryChipSx(category: string): SxProps<Theme> {
  const kind = documentCategoryAccent(category);
  if (kind === 'default') return { fontWeight: 500 };
  return accentChipSx(kind);
}

// ─── Visit status ───────────────────────────────────────────────────────────
// confirmed = green (primary, confirmed = done)
// tentative = ochre (upcoming / scheduled, not yet firm)

export function visitStatusAccent(status: string): AccentKind | 'default' {
  switch (status) {
    case 'confirmed': return 'green';
    case 'tentative': return 'ochre';
    default: return 'default';
  }
}

export function visitStatusChipSx(status: string): SxProps<Theme> {
  const kind = visitStatusAccent(status);
  if (kind === 'default') return { fontWeight: 500 };
  return accentChipSx(kind);
}

// ─── Medication refill urgency ──────────────────────────────────────────────
// overdue / due-within-3d → clay (urgency)
// due-within-7d → ochre (upcoming)
// further out or no refillDate → default

export type RefillUrgency = 'overdue' | 'soon' | 'upcoming' | 'none';

export function refillUrgency(daysUntilRefill: number | null): RefillUrgency {
  if (daysUntilRefill == null) return 'none';
  if (daysUntilRefill < 3) return 'overdue';
  if (daysUntilRefill <= 7) return 'soon';
  return 'upcoming';
}

export function refillChipSx(urgency: RefillUrgency): SxProps<Theme> {
  if (urgency === 'overdue') return accentChipSx('clay');
  if (urgency === 'soon') return accentChipSx('ochre');
  return { fontWeight: 500 };
}
