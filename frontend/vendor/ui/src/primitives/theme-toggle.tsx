'use client';

import { useFieldNoteTheme, type ThemePreference } from '@fieldnote-ui/theme';
import { cx } from '../shared.js';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export interface ThemeToggleProps {
  /** Accessible name for the group. */
  label?: string;
  className?: string;
}

/** Segmented control for light / dark / system. Uses aria-pressed buttons. */
export function ThemeToggle({ label = 'Colour theme', className }: ThemeToggleProps) {
  const { preference, setPreference } = useFieldNoteTheme();
  return (
    <div role="group" aria-label={label} className={cx('fn-theme-toggle', className)}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="fn-theme-toggle__button"
          aria-pressed={preference === option.value}
          onClick={() => setPreference(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
