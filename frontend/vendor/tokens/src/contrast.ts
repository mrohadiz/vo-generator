/**
 * WCAG 2.x contrast utilities. Exported so that documentation and consumers
 * can verify colour pairings against the same tokens the library ships.
 */

/** Relative luminance of a `#RRGGBB` colour, per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Expected #RRGGBB colour, received "${hex}"`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Minimum ratios from WCAG 2.2 success criteria 1.4.3 and 1.4.11. */
export const WCAG_MINIMUM = {
  /** Normal text (AA). */
  text: 4.5,
  /** Large text, 24px or 18.66px bold (AA). */
  largeText: 3,
  /** Non-text UI components and graphical objects (AA). */
  nonText: 3,
} as const;

/** Whether a pairing meets a given minimum. Defaults to normal-text AA. */
export function meetsContrast(a: string, b: string, minimum: number = WCAG_MINIMUM.text): boolean {
  return contrastRatio(a, b) >= minimum;
}
