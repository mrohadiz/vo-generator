'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';
import { PageHeader } from './page-header.js';

export interface NotebookLayoutProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  /** Buttons or links placed at the top-right of the page. */
  actions?: ReactNode;
  /** Optional navigation, usually a KnowledgeNav. */
  navigation?: ReactNode;
  /** Marginal notes: FieldNote, EvidenceTimeline, or anything that annotates the page. */
  margin?: ReactNode;
  /** Id of the main landmark. Change only when several layouts share a page. */
  mainId?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A single page of thinking: a reading column with an optional margin for notes.
 * The reading column is limited to a comfortable measure.
 */
export function NotebookLayout({
  title,
  eyebrow,
  description,
  actions,
  navigation,
  margin,
  mainId = 'main',
  className,
  children,
}: NotebookLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--notebook', className)} data-layout="notebook">
      <SkipLink targetId={mainId} />
      {navigation ? <div className="fn-layout__nav">{navigation}</div> : null}
      <main id={mainId} tabIndex={-1} className="fn-layout__main">
        <PageHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
        <div className="fn-layout__content">{children}</div>
      </main>
      {margin ? (
        <aside className="fn-layout__aside" aria-label="Margin notes">
          {margin}
        </aside>
      ) : null}
    </div>
  );
}
