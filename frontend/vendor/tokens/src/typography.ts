/**
 * Typography. Editorial serif for titles, a humanist sans for interface text,
 * and a monospace for data. No web-font requests are made by the library;
 * consumers may load the faces, the stacks degrade gracefully.
 */
export const fontFamily = {
  /** Titles, notebook headings, pull quotes. */
  display: "'Source Serif 4', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  /** Interface and running text. */
  body: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  /** Measurements, identifiers, timestamps. */
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

/** Font sizes in rem, paired with line-heights (unitless). */
export const fontSize = {
  xs: { size: '0.75rem', lineHeight: '1.5' },
  sm: { size: '0.875rem', lineHeight: '1.5' },
  base: { size: '1rem', lineHeight: '1.6' },
  md: { size: '1.0625rem', lineHeight: '1.55' },
  lg: { size: '1.25rem', lineHeight: '1.45' },
  xl: { size: '1.5rem', lineHeight: '1.3' },
  '2xl': { size: '1.875rem', lineHeight: '1.2' },
  '3xl': { size: '2.375rem', lineHeight: '1.12' },
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export const letterSpacing = {
  tight: '-0.01em',
  normal: '0em',
  /** Used for uppercase kickers such as "OBSERVATION". */
  wide: '0.08em',
} as const;

/** Semantic text roles built from the scale above. Used by components and docs. */
export const textRoles = {
  display: { family: 'display', size: '3xl', weight: 'semibold', tracking: 'tight' },
  heading1: { family: 'display', size: '2xl', weight: 'semibold', tracking: 'tight' },
  heading2: { family: 'display', size: 'xl', weight: 'semibold', tracking: 'tight' },
  heading3: { family: 'display', size: 'lg', weight: 'semibold', tracking: 'normal' },
  body: { family: 'body', size: 'base', weight: 'regular', tracking: 'normal' },
  note: { family: 'display', size: 'md', weight: 'regular', tracking: 'normal' },
  caption: { family: 'body', size: 'sm', weight: 'regular', tracking: 'normal' },
  kicker: { family: 'body', size: 'xs', weight: 'semibold', tracking: 'wide' },
  data: { family: 'mono', size: 'sm', weight: 'regular', tracking: 'normal' },
} as const;

export type TextRole = keyof typeof textRoles;
