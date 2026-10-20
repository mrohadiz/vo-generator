'use client';

import { useId, type ReactNode } from 'react';
import { cx, formatDate, type DateInput } from '../shared.js';

export interface FieldNoteProps {
  /** Optional short heading for the note. */
  title?: string;
  /** Date the note was written. */
  date?: DateInput;
  /** `margin` sits beside the main column with a rule; `plain` is inline. */
  tone?: 'margin' | 'plain';
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A marginal annotation: a short, personal note attached to a larger piece of
 * work. Rendered as <aside>, which is the correct landmark for tangential content.
 */
export function FieldNote({ title, date, tone = 'margin', id, className, children }: FieldNoteProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const stamp = date !== undefined ? formatDate(date) : undefined;
  return (
    <aside
      id={id}
      className={cx('fn-field-note', `fn-field-note--${tone}`, className)}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Field note'}
    >
      {title || stamp ? (
        <p className="fn-field-note__head">
          {title ? (
            <strong id={titleId} className="fn-field-note__title">
              {title}
            </strong>
          ) : null}
          {stamp ? <time dateTime={stamp.dateTime}>{stamp.label}</time> : null}
        </p>
      ) : null}
      <div className="fn-field-note__body">{children}</div>
    </aside>
  );
}
