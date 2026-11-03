import type { CSSProperties } from 'react';

export const CHART_COLORS = {
  primary: 'hsl(var(--chart-1))',
  success: 'hsl(var(--chart-2))',
  warning: 'hsl(var(--chart-3))',
  danger: 'hsl(var(--chart-4))',
  muted: 'hsl(var(--chart-5))',
};

export const CHART_GRID_STROKE = 'hsl(220 25% 18%)';

export const CHART_AXIS_TICK = { fill: 'hsl(215 20% 70%)', fontSize: 12 };

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'hsl(222 40% 9%)',
  border: '1px solid hsl(220 25% 22%)',
  borderRadius: 8,
  color: 'hsl(210 40% 96%)',
  fontSize: 12,
};
