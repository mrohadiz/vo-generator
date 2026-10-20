'use client';

import { clamp01, cx } from '../shared.js';

export interface MeterProps {
  /** Current value, 0 to `max`. */
  value: number;
  /** Maximum value. Default 1. */
  max?: number;
  /** Accessible name, e.g. "Confidence". */
  label: string;
  /** Human-readable value. Defaults to a percentage when `max` is 1. */
  valueText?: string;
  className?: string;
}

/**
 * A measured quantity (e.g. confidence). Uses role="meter", which is the correct
 * semantic for a value within a known range, unlike progressbar (task progress).
 */
export function Meter({ value, max = 1, label, valueText, className }: MeterProps) {
  const ratio = max > 0 ? clamp01(value / max) : 0;
  const pct = Math.round(ratio * 100);
  const text = valueText ?? (max === 1 ? `${pct}%` : `${value} of ${max}`);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={text}
      className={cx('fn-meter', className)}
    >
      <span className="fn-meter__track" aria-hidden="true">
        <span className="fn-meter__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="fn-meter__text">{text}</span>
    </div>
  );
}
