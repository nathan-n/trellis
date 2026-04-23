import { Box, TextField, InputAdornment, Chip, Stack, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import { Mood } from '../../constants';

export interface CareLogFilters {
  text: string;
  mood: '' | Mood;
  authorUid: string; // '' = all
  handoffOnly: boolean;
}

export const emptyFilters: CareLogFilters = {
  text: '',
  mood: '',
  authorUid: '',
  handoffOnly: false,
};

interface AuthorOption {
  uid: string;
  name: string;
}

interface Props {
  filters: CareLogFilters;
  onChange: (f: CareLogFilters) => void;
  authors: AuthorOption[];
}

const moodLabels: Record<Mood, string> = {
  calm: 'Calm',
  happy: 'Happy',
  agitated: 'Agitated',
  confused: 'Confused',
  withdrawn: 'Withdrawn',
  other: 'Other',
};

export default function CareLogFilterBar({ filters, onChange, authors }: Props) {
  const activeFilterCount =
    (filters.text ? 1 : 0) +
    (filters.mood ? 1 : 0) +
    (filters.authorUid ? 1 : 0) +
    (filters.handoffOnly ? 1 : 0);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1, alignItems: 'stretch' }}>
        <TextField
          size="small"
          placeholder="Search notes, behaviors, activities…"
          value={filters.text}
          onChange={(e) => onChange({ ...filters, text: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Author</InputLabel>
          <Select
            label="Author"
            value={filters.authorUid}
            onChange={(e) => onChange({ ...filters, authorUid: e.target.value })}
          >
            <MenuItem value="">All</MenuItem>
            {authors.map((a) => (
              <MenuItem key={a.uid} value={a.uid}>{a.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {(Object.keys(moodLabels) as Mood[]).map((m) => (
          <Chip
            key={m}
            label={moodLabels[m]}
            size="small"
            onClick={() => onChange({ ...filters, mood: filters.mood === m ? '' : m })}
            color={filters.mood === m ? 'primary' : 'default'}
            variant={filters.mood === m ? 'filled' : 'outlined'}
          />
        ))}
        <Chip
          label="Shift handoffs"
          size="small"
          onClick={() => onChange({ ...filters, handoffOnly: !filters.handoffOnly })}
          color={filters.handoffOnly ? 'primary' : 'default'}
          variant={filters.handoffOnly ? 'filled' : 'outlined'}
        />
        {activeFilterCount > 0 && (
          <Chip
            label="Clear filters"
            size="small"
            onClick={() => onChange(emptyFilters)}
            color="default"
            variant="outlined"
          />
        )}
      </Stack>
    </Box>
  );
}
