'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';
import { PageHeader } from './page-header.js';

export interface GardenLayoutProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Browse by topic or stage, usually a KnowledgeNav. */
  navigation?: ReactNode;
  /** Recently tended notes or a list of recent changes. */
  recent?: ReactNode;
  mainId?: string;
  className?: string;
  /** Usually a GardenGrid of KnowledgeNode cards. */
  children: ReactNode;
}

/** An irregular, browsable collection of connected notes: navigation, a grid of nodes, and recent changes. */
export function GardenLayout({
  title,
  eyebrow = 'Digital garden',
  description,
  actions,
  navigation,
  recent,
  mainId = 'main',
  className,
  children,
}: GardenLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--garden', className)} data-layout="garden">
      <SkipLink targetId={mainId} />
      {navigation ? <div className="fn-layout__nav">{navigation}</div> : null}
      <main id={mainId} tabIndex={-1} className="fn-layout__main">
        <PageHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
        <div className="fn-layout__content">{children}</div>
      </main>
      {recent ? (
        <aside className="fn-layout__aside" aria-label="Recently tended">
          {recent}
        </aside>
      ) : null}
    </div>
  );
}

export interface GardenGridProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

/** Responsive grid for KnowledgeNode cards. */
export function GardenGrid({ children, label, className }: GardenGridProps) {
  return (
    <div className={cx('fn-garden-grid', className)} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  );
}
