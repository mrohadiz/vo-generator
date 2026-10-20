'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';
import { PageHeader } from './page-header.js';

export interface ObservatoryLayoutProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Navigation for the observatory, usually a KnowledgeNav. */
  navigation?: ReactNode;
  /** A band of key readings shown above the main content, e.g. Meter or stat blocks. */
  readings?: ReactNode;
  /** Side panel of instruments, filters or settings. */
  instruments?: ReactNode;
  mainId?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A place for watching a system over time: a band of readings across the top,
 * the main observation field below, and an instrument panel on the side.
 */
export function ObservatoryLayout({
  title,
  eyebrow,
  description,
  actions,
  navigation,
  readings,
  instruments,
  mainId = 'main',
  className,
  children,
}: ObservatoryLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--observatory', className)} data-layout="observatory">
      <SkipLink targetId={mainId} />
      {navigation ? <div className="fn-layout__nav">{navigation}</div> : null}
      <main id={mainId} tabIndex={-1} className="fn-layout__main">
        <PageHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
        {readings ? (
          <section className="fn-layout__readings" aria-label="Key readings">
            {readings}
          </section>
        ) : null}
        <div className="fn-layout__content">{children}</div>
      </main>
      {instruments ? (
        <aside className="fn-layout__aside" aria-label="Instruments">
          {instruments}
        </aside>
      ) : null}
    </div>
  );
}
