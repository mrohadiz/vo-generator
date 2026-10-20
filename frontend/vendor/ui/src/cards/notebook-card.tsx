'use client';

import { useId, type ReactNode } from 'react';
import { cx, type HeadingLevel, type HeadingTag } from '../shared.js';

export interface NotebookCardProps {
  title: string;
  /** Small label above the title, e.g. the project or question area. */
  eyebrow?: string;
  /** Actions placed at the top-right, e.g. buttons. */
  actions?: ReactNode;
  /** Page number printed in the folio. */
  page?: number | string;
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * A notebook page: a titled, ruled surface that groups related notes and cards.
 * The ruling is decorative (CSS) and disappears in print.
 */
export function NotebookCard({
  title,
  eyebrow,
  actions,
  page,
  headingLevel = 2,
  id,
  className,
  children,
}: NotebookCardProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const Heading = `h${headingLevel}` as HeadingTag;
  return (
    <section id={id} className={cx('fn-notebook', className)} aria-labelledby={titleId}>
      <header className="fn-notebook__header">
        <div>
          {eyebrow ? <p className="fn-kicker">{eyebrow}</p> : null}
          <Heading id={titleId} className="fn-notebook__title">
            {title}
          </Heading>
        </div>
        {actions ? <div className="fn-notebook__actions">{actions}</div> : null}
      </header>
      {children !== undefined && children !== null ? <div className="fn-notebook__body">{children}</div> : null}
      {page !== undefined ? <p className="fn-notebook__folio">p. {page}</p> : null}
    </section>
  );
}
