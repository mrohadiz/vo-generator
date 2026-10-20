'use client';

import type { ReactNode } from 'react';
import { cx, type Tone } from '../shared.js';

export interface StatusChipProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** A small status label. The tone tints the chip; the children carry the meaning. */
export function StatusChip({ tone = 'neutral', children, className }: StatusChipProps) {
  return (
    <span className={cx('fn-chip', className)} data-tone={tone}>
      {children}
    </span>
  );
}
