import { useState } from 'react';
import { Box, Typography, Chip, Link, Collapse, Button, Stack } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { OpenFdaMetadata } from '../../types';

interface MedicationDrugInfoProps {
  openFda: OpenFdaMetadata | null | undefined;
}

function TextSection({ label, text }: { label: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > 200;
  const display = isLong && !expanded ? text.slice(0, 200) + '...' : text;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
        {display}
      </Typography>
      {isLong && (
        <Button size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0, minWidth: 0, fontSize: '0.7rem' }}>
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
}

export default function MedicationDrugInfo({ openFda }: MedicationDrugInfoProps) {
  const [open, setOpen] = useState(false);

  if (!openFda) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        startIcon={<InfoOutlinedIcon sx={{ fontSize: '0.9rem' }} />}
        onClick={() => setOpen(!open)}
        sx={{ fontSize: '0.75rem', p: 0, minWidth: 0 }}
      >
        {open ? 'Hide drug info' : 'Drug info'}
      </Button>
      <Collapse in={open}>
        {/* slate accent (reference/reports tone) replaces MUI info blue
            for pharm class chips — matches the Direction C accent map
            where reference data uses slate across the app. */}
        <Box sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: 'slate.light' }}>
          {openFda.pharmClassEpc.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
              {openFda.pharmClassEpc.map((cls, i) => (
                <Chip
                  key={i}
                  label={cls}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20, color: 'slate.dark', borderColor: 'slate.main' }}
                />
              ))}
            </Stack>
          )}
          <TextSection label="Purpose" text={openFda.indicationsAndUsage} />
          <TextSection label="Common Side Effects" text={openFda.adverseReactions} />
          <TextSection label="Drug Interactions" text={openFda.drugInteractions} />
          <TextSection label="Warnings" text={openFda.warningsAndCautions} />
          <Link
            href={openFda.dailyMedUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
          >
            <OpenInNewIcon sx={{ fontSize: '0.8rem' }} /> View full details on DailyMed
          </Link>
        </Box>
      </Collapse>
    </Box>
  );
}
