import { useState } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface TaskSearchBarProps {
  onSearch: (query: string) => void;
}

export default function TaskSearchBar({ onSearch }: TaskSearchBarProps) {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    onSearch(q);
  };

  return (
    <TextField
      placeholder="Search tasks..."
      size="small"
      value={value}
      onChange={handleChange}
      sx={{ minWidth: 250 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
