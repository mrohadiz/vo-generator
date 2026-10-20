'use client';

import { useId, type ReactNode } from 'react';
import type { Intent } from '@fieldnote-ui/tokens';
import { IntentBadge } from '../primitives/intent-badge.js';
import { cx, type HeadingLevel, type HeadingTag } from '../shared.js';

/** Props shared by every card. */
export interface BaseCardProps {
  /** Card title. Rendered as a heading at `headingLevel`. */
  title: string;
  /** Use the heading level that fits the page outline. Default 3. */
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export interface CardFrameProps extends BaseCardProps {
  intent?: Intent;
  /** Overrides the kicker text for an intent (e.g. "Experiment"). */
  kickerLabel?: string;
  /** Status chip, rendered on the kicker row. */
  status?: ReactNode;
  /** Custom title content, e.g. a stretched link. Falls back to `title`. */
  titleContent?: ReactNode;
  footer?: ReactNode;
  dataAttributes?: Record<string, string | undefined>;
}

/**
 * The structural frame shared by all FieldNote cards:
 * kicker (intent) → heading → body → footer. Renders an <article> labelled by
 * its heading, so screen-reader users can navigate by landmark and heading.
 */
export function CardFrame({
  title,
  titleContent,
  intent,
  kickerLabel,
  status,
  headingLevel = 3,
  id,
  className,
  children,
  footer,
  dataAttributes,
}: CardFrameProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const titleId = `${baseId}-title`;
  const Heading = `h${headingLevel}` as HeadingTag;
  const hasKickerRow = Boolean(intent || status);

  return (
    <article
      id={id}
      className={cx('fn-card', className)}
      data-intent={intent}
      aria-labelledby={titleId}
      {...dataAttributes}
    >
      <header className="fn-card__header">
        {hasKickerRow ? (
          <div className="fn-card__kicker-row">
            {intent ? <IntentBadge intent={intent} label={kickerLabel} /> : <span />}
            {status}
          </div>
        ) : null}
        <Heading id={titleId} className="fn-card__title">
          {titleContent ?? title}
        </Heading>
      </header>
      {children !== undefined && children !== null && children !== false ? (
        <div className="fn-card__body">{children}</div>
      ) : null}
      {footer ? <footer className="fn-card__footer">{footer}</footer> : null}
    </article>
  );
}
