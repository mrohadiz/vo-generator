'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../shared.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Both sizes meet the WCAG 2.2 AA 24×24px minimum target size. */
  size?: 'sm' | 'md';
}

/** Minimal, accessible button. Native element, visible focus ring, 40px target by default. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('fn-button', `fn-button--${variant}`, `fn-button--${size}`, className)}
      {...rest}
    />
  );
});
