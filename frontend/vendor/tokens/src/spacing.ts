/**
 * Spacing scale on a 4px base. Keys mirror Tailwind's scale so that the
 * generated preset can be used interchangeably with utility-first code.
 * Values are in px; CSS output converts them to rem where it matters.
 */
export const space = {
  '0': 0,
  px: 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
  '24': 96,
} as const;

export type SpaceKey = keyof typeof space;

/** Layout measures used by FieldNote layouts and reading width. */
export const measure = {
  /** Comfortable reading column (~68ch at body size). */
  prose: '68ch',
  /** Notebook page column. */
  page: '48rem',
  /** Wide observatory / workspace canvas. */
  canvas: '90rem',
  /** Narrow assistant conversation column. */
  conversation: '46rem',
} as const;
