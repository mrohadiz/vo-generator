/**
 * FieldNote colour system.
 *
 * Brand values from the brief are kept verbatim where they are used as fills,
 * borders or large graphics. Where a colour is used as *text* it is paired with
 * a darker `…Text` variant so that every text pairing meets WCAG 2.2 AA (4.5:1).
 * The contrast test in `__tests__/contrast.test.ts` enforces this.
 */

/** Semantic intelligence intents — the five thinking modes of FieldNote. */
export const intents = ['observation', 'evidence', 'insight', 'decision', 'learning'] as const;
export type Intent = (typeof intents)[number];

/** Per-intent colour family. */
export interface IntentColor {
  /** Fills, marks, chart series, icons. Meets 3:1 against paper (non-text). */
  accent: string;
  /** Text and labels on paper, surface and tint. Meets 4.5:1. */
  text: string;
  /** Subtle background wash for chips and card headers. */
  tint: string;
  /** Hairline used for intent-coloured borders. */
  border: string;
}

export interface ColorScheme {
  /** Page background. */
  paper: string;
  /** Card and panel surface. */
  surface: string;
  /** Inset / sunken areas (inputs, code, table stripes). */
  surfaceSunken: string;
  textPrimary: string;
  textSecondary: string;
  /** Tertiary metadata. Still meets 4.5:1 on paper and surface. */
  textTertiary: string;
  /** Decorative hairlines. Not sufficient for control boundaries. */
  border: string;
  /** Control boundaries (inputs, checkboxes). Meets 3:1. */
  borderStrong: string;
  primary: string;
  primaryHover: string;
  /** Text/icon colour placed on `primary`. */
  onPrimary: string;
  /** Success indicator fill. */
  success: string;
  /** Success text (AA). */
  successText: string;
  /** Danger / refuted indicator fill. */
  danger: string;
  /** Danger text (AA). */
  dangerText: string;
  /** Focus ring. Meets 3:1 against paper and surface. */
  focus: string;
  intents: Record<Intent, IntentColor>;
}

/** Brand values as specified in the FieldNote brief (light mode). */
export const brand = {
  paper: '#F7F3ED',
  surface: '#FCF9F4',
  textPrimary: '#2A2820',
  textSecondary: '#5D5242',
  border: '#C8BEAF',
  primary: '#4A6B7B',
  success: '#5B7F6A',
} as const;

export const lightColors: ColorScheme = {
  paper: brand.paper,
  surface: brand.surface,
  surfaceSunken: '#F0EBE2',
  textPrimary: brand.textPrimary,
  textSecondary: brand.textSecondary,
  textTertiary: '#6F6555',
  border: brand.border,
  borderStrong: '#8A7F6E',
  primary: brand.primary,
  primaryHover: '#3C5A69',
  onPrimary: '#FCF9F4',
  success: brand.success,
  successText: '#466B54',
  danger: '#94463A',
  dangerText: '#94463A',
  focus: '#2F5A6E',
  intents: {
    observation: { accent: '#6E6A60', text: '#4F4B43', tint: '#ECE9E2', border: '#A9A398' },
    evidence: { accent: '#3D6A86', text: '#2F5670', tint: '#E3ECF2', border: '#8FAFC2' },
    insight: { accent: '#4E7D5F', text: '#3B6149', tint: '#E4EFE7', border: '#9CC0A9' },
    decision: { accent: '#B07A22', text: '#7A5212', tint: '#F7EBD3', border: '#D3A95C' },
    learning: { accent: '#7A5F95', text: '#5E4777', tint: '#EEE8F4', border: '#B3A0C8' },
  },
};

export const darkColors: ColorScheme = {
  paper: '#171611',
  surface: '#201E17',
  surfaceSunken: '#1B1A14',
  textPrimary: '#ECE6D9',
  textSecondary: '#BDB39F',
  textTertiary: '#A39A88',
  border: '#4B4538',
  borderStrong: '#7D7463',
  primary: '#8DB4C6',
  primaryHover: '#A3C8D6',
  onPrimary: '#12181B',
  success: '#7DAE91',
  successText: '#9CC4AA',
  danger: '#E3A190',
  dangerText: '#E3A190',
  focus: '#A9D0E0',
  intents: {
    observation: { accent: '#A7A196', text: '#D6D1C6', tint: '#2A2822', border: '#5E584B' },
    evidence: { accent: '#7FA9C4', text: '#A9CAE0', tint: '#1F2A33', border: '#3F5A6C' },
    insight: { accent: '#8DBA9B', text: '#B2D6BE', tint: '#1F2B23', border: '#3E5D49' },
    decision: { accent: '#D9A54E', text: '#E8BE72', tint: '#352A17', border: '#7A5C2E' },
    learning: { accent: '#AC97C9', text: '#C7B6DE', tint: '#2B2435', border: '#5C4A74' },
  },
};

export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;
