/**
 * Motion tokens. Durations are intentionally short: FieldNote motion confirms
 * state changes, it never performs. `prefers-reduced-motion` collapses every
 * duration to `instant` (see the generated CSS and `@fieldnote-ui/theme`).
 */
export const duration = {
  instant: '0ms',
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  entrance: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  linear: 'linear',
} as const;

export const motion = { duration, easing } as const;
