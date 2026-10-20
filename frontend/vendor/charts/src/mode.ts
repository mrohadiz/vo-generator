/**
 * Chart colours come from the same token objects as the CSS custom properties,
 * so SVG attributes (which cannot read CSS variables reliably) stay in sync.
 */
export { darkColors, lightColors } from '@fieldnote-ui/tokens';
export type ResolvedMode = 'light' | 'dark';
