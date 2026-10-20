'use client';

import type { ReactNode } from 'react';
import { cx } from '../shared.js';

export interface TagProps {
  children: ReactNode;
  className?: string;
  /** Render as a link when provided. */
  href?: string;
}

/** Neutral metadata label, e.g. a topic or a folder name. */
export function Tag({ children, className, href }: TagProps) {
  if (href) {
    return (
      <a href={href} className={cx('fn-tag', 'fn-tag--link', className)}>
        {children}
      </a>
    );
  }
  return <span className={cx('fn-tag', className)}>{children}</span>;
}
