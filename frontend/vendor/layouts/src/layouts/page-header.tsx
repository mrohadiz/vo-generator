'use client';

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** The title block at the top of every layout's main region. Owns the page's h1. */
export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <header className="fn-page-header">
      <div className="fn-page-header__text">
        {eyebrow ? <p className="fn-kicker">{eyebrow}</p> : null}
        <h1 className="fn-page-header__title">{title}</h1>
        {description ? <div className="fn-page-header__description">{description}</div> : null}
      </div>
      {actions ? <div className="fn-page-header__actions">{actions}</div> : null}
    </header>
  );
}
