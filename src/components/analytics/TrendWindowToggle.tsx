import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export type TrendWindow = '7d' | '30d' | '90d';

export const WINDOW_DAYS: Record<TrendWindow, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

interface Props {
  value: TrendWindow;
  onChange: (v: TrendWindow) => void;
}

export default function TrendWindowToggle({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, v) => v && onChange(v as TrendWindow)}
    >
      <ToggleButton value="7d">7 days</ToggleButton>
      <ToggleButton value="30d">30 days</ToggleButton>
      <ToggleButton value="90d">90 days</ToggleButton>
    </ToggleButtonGroup>
  );
}
