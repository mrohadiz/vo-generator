'use client';

import { useId, type ReactNode } from 'react';
import { StatusChip } from '../primitives/status-chip.js';
import { cx, type DateInput, type HeadingLevel, type HeadingTag } from '../shared.js';
import { DateValue } from './meta-list.js';
import { LEARNING_OUTCOME, type LearningOutcome } from './learning-card.js';

export interface LearningRecordProps {
  title: string;
  outcome: LearningOutcome;
  recordedOn: DateInput;
  /** The decision this record refers back to. */
  decision?: { label: string; href?: string };
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
  /** The lesson, in one or two sentences. */
  children: ReactNode;
}

/**
 * A compact, archival entry in the learning log. Denser than LearningCard, meant
 * for lists of past outcomes. Keeps a dated link back to the decision it concerns.
 */
export function LearningRecord({
  title,
  outcome,
  recordedOn,
  decision,
  headingLevel = 3,
  id,
  className,
  children,
}: LearningRecordProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const Heading = `h${headingLevel}` as HeadingTag;
  const meta = LEARNING_OUTCOME[outcome];
  return (
    <article id={id} className={cx('fn-record', className)} data-intent="learning" aria-labelledby={titleId}>
      <header className="fn-record__header">
        <Heading id={titleId} className="fn-record__title">
          {title}
        </Heading>
        <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
      </header>
      <dl className="fn-meta">
        <div className="fn-meta__item">
          <dt>Recorded</dt>
          <dd>
            <DateValue value={recordedOn} />
          </dd>
        </div>
        {decision ? (
          <div className="fn-meta__item">
            <dt>Decision</dt>
            <dd>{decision.href ? <a href={decision.href}>{decision.label}</a> : decision.label}</dd>
          </div>
        ) : null}
      </dl>
      <div className="fn-record__lesson">{children}</div>
    </article>
  );
}
