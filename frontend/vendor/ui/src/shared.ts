import type { Intent } from '@fieldnote-ui/tokens';

/** Heading levels used by cards. Cards never emit <h1>: the page owns it. */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;
export type HeadingTag = `h${HeadingLevel}`;

/** Date inputs accepted by components. Strings are ISO-8601 (e.g. `2026-10-08`). */
export type DateInput = string | Date;

export const INTENT_LABELS: Record<Intent, string> = {
  observation: 'Observation',
  evidence: 'Evidence',
  insight: 'Insight',
  decision: 'Decision',
  learning: 'Learning',
};

/** Semantic tone used for status chips. Always paired with a text label. */
export type Tone = 'positive' | 'negative' | 'caution' | 'info' | 'neutral';

const dateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formats a date deterministically (UTC) so server and client render identical
 * markup and hydration does not mismatch across time zones.
 */
export function formatDate(value: DateInput): { dateTime: string; label: string } {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { dateTime: String(value), label: String(value) };
  return { dateTime: date.toISOString(), label: dateFormat.format(date) };
}

export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export const STATUS_TONE_LABEL: Record<Tone, string> = {
  positive: 'positive',
  negative: 'negative',
  caution: 'caution',
  info: 'information',
  neutral: 'neutral',
};
