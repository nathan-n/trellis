import { useState } from 'react';
import { Box, TextField, Chip, Typography, Autocomplete } from '@mui/material';

interface ChipInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  chipColor?: 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success';
  /**
   * Optional list of suggested values to autocomplete from (e.g., past values).
   * When provided, ChipInput renders as an MUI Autocomplete with free-solo input.
   * When omitted, falls back to the simpler TextField-based chip input.
   */
  suggestions?: string[];
  /** Optional helper text under the input; defaults to a sensible prompt. */
  helperText?: string;
}

export default function ChipInput({
  label,
  placeholder,
  values,
  onChange,
  chipColor = 'default',
  suggestions,
  helperText,
}: ChipInputProps) {
  // ── Autocomplete variant (with past-value suggestions) ───────────────────
  if (suggestions !== undefined) {
    // Exclude already-selected values from dropdown options.
    const availableOptions = suggestions.filter(
      (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())
    );
    return (
      <Box>
        <Autocomplete
          multiple
          freeSolo
          size="small"
          options={availableOptions}
          value={values}
          onChange={(_, newValues) => {
            // Normalize: trim, drop empties, dedupe case-insensitively.
            const seen = new Set<string>();
            const next: string[] = [];
            for (const raw of newValues) {
              const v = (typeof raw === 'string' ? raw : '').trim();
              if (!v) continue;
              const key = v.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              next.push(v);
            }
            onChange(next);
          }}
          renderTags={(vals, getTagProps) =>
            vals.map((option, index) => {
              const { key, ...chipProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option}
                  size="small"
                  color={chipColor}
                  sx={{ fontWeight: 500 }}
                  {...chipProps}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={values.length === 0 ? placeholder : ''}
              helperText={helperText ?? 'Select from suggestions or type to add your own'}
            />
          )}
        />
      </Box>
    );
  }

  // ── Simple variant (original behavior, unchanged) ────────────────────────
  return <SimpleChipInput
    label={label}
    placeholder={placeholder}
    values={values}
    onChange={onChange}
    chipColor={chipColor}
    helperText={helperText}
  />;
}

interface SimpleProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  chipColor: 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success';
  helperText?: string;
}

function SimpleChipInput({ label, placeholder, values, onChange, chipColor, helperText }: SimpleProps) {
  const [inputValue, setInputValue] = useState('');

  const addValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const isDuplicate = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) return;
    onChange([...values, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const handleDelete = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <TextField
        label={label}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.replace(',', ''))}
        onKeyDown={handleKeyDown}
        onBlur={() => addValue(inputValue)}
        fullWidth
        size="small"
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {helperText ?? 'Press Enter or comma to add'}
      </Typography>
      {values.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {values.map((value, index) => (
            <Chip
              key={index}
              label={value}
              onDelete={() => handleDelete(index)}
              color={chipColor}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
