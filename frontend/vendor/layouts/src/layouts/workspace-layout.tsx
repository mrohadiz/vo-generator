'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';

export interface WorkspaceLayoutProps {
  /** Visible title of the current item. */
  title: string;
  /** Left column, usually a KnowledgeNav with the thinking stages. */
  navigation: ReactNode;
  /** Toolbar across the top of the main area. */
  toolbar?: ReactNode;
  /** Right column: inspector for the selected item (details, evidence, decision state). */
  inspector?: ReactNode;
  /** Label for the inspector landmark. Default "Inspector". */
  inspectorLabel?: string;
  mainId?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A three-column workspace for deciding: navigation, the work itself, and an
 * inspector for the selected item. Columns collapse to one column on narrow screens.
 */
export function WorkspaceLayout({
  title,
  navigation,
  toolbar,
  inspector,
  inspectorLabel = 'Inspector',
  mainId = 'main',
  className,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--workspace', className)} data-layout="workspace">
      <SkipLink targetId={mainId} />
      <div className="fn-layout__nav">{navigation}</div>
      <main id={mainId} tabIndex={-1} className="fn-layout__main">
        {toolbar ? (
          <div className="fn-layout__toolbar" role="group" aria-label={`${title} actions`}>
            {toolbar}
          </div>
        ) : null}
        <h1 className="fn-page-header__title">{title}</h1>
        <div className="fn-layout__content">{children}</div>
      </main>
      {inspector ? (
        <aside className="fn-layout__aside" aria-label={inspectorLabel}>
          {inspector}
        </aside>
      ) : null}
    </div>
  );
}
