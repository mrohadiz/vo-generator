'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';
import { PageHeader } from './page-header.js';

export interface ResearchLayoutProps {
  title: string;
  /** The question this research answers, shown prominently under the title. */
  question?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  /** Sources, references, or the list of cards used. */
  sources?: ReactNode;
  /** Section navigation, e.g. tabs or an in-page list. */
  sections?: ReactNode;
  mainId?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A research workspace: the question leads, the sources sit beside the argument,
 * and sections let the reader move through the work without losing their place.
 */
export function ResearchLayout({
  title,
  question,
  eyebrow = 'Research',
  actions,
  sources,
  sections,
  mainId = 'main',
  className,
  children,
}: ResearchLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--research', className)} data-layout="research">
      <SkipLink targetId={mainId} />
      {sections ? <div className="fn-layout__nav">{sections}</div> : null}
      <main id={mainId} tabIndex={-1} className="fn-layout__main">
        <PageHeader title={title} eyebrow={eyebrow} actions={actions} description={question} />
        <div className="fn-layout__content">{children}</div>
      </main>
      {sources ? (
        <aside className="fn-layout__aside" aria-label="Sources">
          {sources}
        </aside>
      ) : null}
    </div>
  );
}
