'use client';

import type { ReactNode } from 'react';
import { SkipLink } from '../skip-link.js';
import { cx } from './util.js';

export interface AssistantLayoutProps {
  /** Visible title of the conversation. */
  title: string;
  /** Thread list or other navigation. */
  threads?: ReactNode;
  /** Context panel: sources, observations or insights the assistant is using. */
  context?: ReactNode;
  /** The message input, usually a form at the bottom of the conversation. */
  composer?: ReactNode;
  /** Label for the conversation log. Default "Conversation". */
  conversationLabel?: string;
  mainId?: string;
  className?: string;
  /** The messages. Wrap them in an element with role="log" for live announcements. */
  children: ReactNode;
}

/**
 * A conversation with a personal assistant: threads on the left, the dialogue
 * in the centre, the evidence it relies on on the right, and the composer at the foot.
 */
export function AssistantLayout({
  title,
  threads,
  context,
  composer,
  conversationLabel = 'Conversation',
  mainId = 'main',
  className,
  children,
}: AssistantLayoutProps) {
  return (
    <div className={cx('fn-layout', 'fn-layout--assistant', className)} data-layout="assistant">
      <SkipLink targetId={mainId} />
      {threads ? <div className="fn-layout__nav">{threads}</div> : null}
      <main id={mainId} tabIndex={-1} className="fn-layout__main fn-layout__main--conversation">
        <header className="fn-layout__conversation-header">
          <h1 className="fn-page-header__title">{title}</h1>
        </header>
        <section className="fn-layout__conversation" aria-label={conversationLabel}>
          {children}
        </section>
        {composer ? <div className="fn-layout__composer">{composer}</div> : null}
      </main>
      {context ? (
        <aside className="fn-layout__aside" aria-label="Context">
          {context}
        </aside>
      ) : null}
    </div>
  );
}
