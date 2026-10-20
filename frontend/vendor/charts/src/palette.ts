import { darkColors, lightColors, type ResolvedMode } from './mode.js';

export type { ResolvedMode };

/** Hex colours for SVG attributes, resolved for a colour scheme. Generated from the same tokens as CSS. */
export interface ChartPalette {
  /** Hairline grid. Decorative, so below 3:1 is acceptable. */
  grid: string;
  /** Axis and tick labels. Meets 4.5:1 on the chart surface. */
  axis: string;
  /** Series names and legends. */
  label: string;
  surface: string;
  text: string;
  border: string;
  observation: string;
  evidence: string;
  insight: string;
  decision: string;
  learning: string;
  /** Learning outcome series: confirmed, mixed, refuted. Purple family plus neutral grey. */
  outcome: { confirmed: string; mixed: string; refuted: string };
}

export function getChartPalette(mode: ResolvedMode): ChartPalette {
  const c = mode === 'dark' ? darkColors : lightColors;
  return {
    grid: c.border,
    axis: c.textSecondary,
    label: c.textSecondary,
    surface: c.surface,
    text: c.textPrimary,
    border: c.borderStrong,
    observation: c.intents.observation.accent,
    evidence: c.intents.evidence.accent,
    insight: c.intents.insight.accent,
    decision: c.intents.decision.accent,
    learning: c.intents.learning.accent,
    outcome: {
      confirmed: c.intents.learning.accent,
      mixed: c.intents.learning.border,
      refuted: c.intents.observation.accent,
    },
  };
}
