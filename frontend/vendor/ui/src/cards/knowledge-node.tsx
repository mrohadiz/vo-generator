'use client';

import { useId, type ReactNode } from 'react';
import type { Intent } from '@fieldnote-ui/tokens';
import { cx, type HeadingLevel, type HeadingTag } from '../shared.js';

export interface KnowledgeNodeProps {
  title: string;
  /** Short description of the note or concept. */
  summary?: string;
  /** Kind of node, shown as a small label, e.g. "Concept", "Source", "Question". */
  kind?: string;
  /** Thinking mode the node belongs to, if any. */
  intent?: Intent;
  /** Makes the node a link. The whole card is clickable via a stretched link. */
  href?: string;
  /** Number of connections to other nodes. */
  linkCount?: number;
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
  footer?: ReactNode;
}

/** A node in a digital garden: a note, concept or source that links to others. */
export function KnowledgeNode({
  title,
  summary,
  kind,
  intent,
  href,
  linkCount,
  headingLevel = 3,
  id,
  className,
  footer,
}: KnowledgeNodeProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const Heading = `h${headingLevel}` as HeadingTag;
  return (
    <article id={id} className={cx('fn-node', className)} data-intent={intent} aria-labelledby={titleId}>
      {kind ? <p className="fn-node__kind">{kind}</p> : null}
      <Heading id={titleId} className="fn-node__title">
        {href ? (
          <a href={href} className="fn-stretched">
            {title}
          </a>
        ) : (
          title
        )}
      </Heading>
      {summary ? <p className="fn-node__summary">{summary}</p> : null}
      {footer || linkCount !== undefined ? (
        <div className="fn-node__footer">
          {linkCount !== undefined ? (
            <span>
              {linkCount} {linkCount === 1 ? 'link' : 'links'}
            </span>
          ) : null}
          {footer}
        </div>
      ) : null}
    </article>
  );
}
