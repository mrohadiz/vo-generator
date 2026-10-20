'use client';

import type { ReactNode } from 'react';
import type { Intent } from '@fieldnote-ui/tokens';
import { IntentBadge } from '../primitives/intent-badge.js';
import { cx, formatDate, type DateInput } from '../shared.js';

export interface TimelineItem {
  id: string;
  /** When it happened. */
  at: DateInput;
  /** The thinking mode of this event. */
  intent: Intent;
  title: string;
  description?: ReactNode;
  /** Optional link to the underlying card or record. */
  href?: string;
}

export interface EvidenceTimelineProps {
  /** Accessible name for the list, e.g. "History of the pricing decision". Required. */
  label: string;
  /** Events in the order they should be read (usually chronological). */
  items: TimelineItem[];
  /** Shown instead of the list when there are no items. */
  emptyMessage?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * A chronological record of how a conclusion was reached: observations, the
 * evidence gathered, insights drawn, decisions taken and lessons recorded.
 * Rendered as an ordered list so order is announced to assistive technology.
 */
export function EvidenceTimeline({ label, items, emptyMessage = 'Nothing recorded yet.', id, className }: EvidenceTimelineProps) {
  if (items.length === 0) {
    return (
      <p className={cx('fn-timeline-empty', className)} id={id}>
        {emptyMessage}
      </p>
    );
  }
  return (
    <ol id={id} className={cx('fn-timeline', className)} aria-label={label}>
      {items.map((item) => {
        const stamp = formatDate(item.at);
        return (
          <li key={item.id} className="fn-timeline__item" data-intent={item.intent}>
            <time className="fn-timeline__time" dateTime={stamp.dateTime}>
              {stamp.label}
            </time>
            <span className="fn-timeline__marker" aria-hidden="true" />
            <div className="fn-timeline__content">
              <IntentBadge intent={item.intent} />
              <p className="fn-timeline__title">
                {item.href ? <a href={item.href}>{item.title}</a> : item.title}
              </p>
              {item.description ? <div className="fn-timeline__description">{item.description}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
