/** Corner radii. Deliberately restrained: notebooks have crisp corners. */
export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
} as const;

export type RadiusKey = keyof typeof radius;
