import { useState } from 'react';
import { Box, TextField, Chip, Typography } from '@mui/material';

interface ChipInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  chipColor?: 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success';
}

export default function ChipInput({ label, placeholder, values, onChange, chipColor = 'default' }: ChipInputProps) {
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
        Press Enter or comma to add
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
