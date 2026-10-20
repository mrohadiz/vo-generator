/**
 * Elevation. Shadows are warm (tinted by the text colour) rather than neutral
 * black, so that surfaces read as paper lifted from a desk, not as UI chrome.
 */
export const shadow = {
  light: {
    none: 'none',
    xs: '0 1px 0 rgba(42, 40, 32, 0.06)',
    sm: '0 1px 2px rgba(42, 40, 32, 0.08), 0 1px 1px rgba(42, 40, 32, 0.04)',
    md: '0 6px 16px -6px rgba(42, 40, 32, 0.18), 0 2px 4px rgba(42, 40, 32, 0.06)',
    lg: '0 18px 40px -12px rgba(42, 40, 32, 0.24)',
    /** Inner hairline used on sunken wells. */
    inset: 'inset 0 1px 2px rgba(42, 40, 32, 0.08)',
  },
  dark: {
    none: 'none',
    xs: '0 1px 0 rgba(0, 0, 0, 0.4)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.45), 0 1px 1px rgba(0, 0, 0, 0.3)',
    md: '0 8px 20px -8px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3)',
    lg: '0 22px 46px -14px rgba(0, 0, 0, 0.7)',
    inset: 'inset 0 1px 2px rgba(0, 0, 0, 0.35)',
  },
} as const;

export type ShadowKey = keyof typeof shadow.light;
