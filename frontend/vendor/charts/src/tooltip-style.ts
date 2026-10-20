import type { CSSProperties } from 'react';

/** Tooltip styling that reads CSS custom properties, so it follows light and dark mode. */
export const tooltipContentStyle: CSSProperties = {
  background: 'var(--fn-color-surface)',
  color: 'var(--fn-color-text-primary)',
  border: '1px solid var(--fn-color-border-strong)',
  borderRadius: 'var(--fn-radius-sm)',
  boxShadow: 'var(--fn-shadow-md)',
  fontFamily: 'var(--fn-font-body)',
  fontSize: 'var(--fn-text-sm)',
  padding: 'var(--fn-space-2) var(--fn-space-3)',
};

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--fn-color-text-primary)',
  fontWeight: 600,
  marginBottom: 'var(--fn-space-1)',
};

export const tooltipItemStyle: CSSProperties = {
  color: 'var(--fn-color-text-secondary)',
  padding: 0,
};
