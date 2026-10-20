'use client';

import { useId } from 'react';
import { cx, type HeadingLevel, type HeadingTag } from '../shared.js';

export interface ClusterInsight {
  id: string;
  title: string;
  summary?: string;
  href?: string;
}

export interface InsightClusterProps {
  title: string;
  /** What ties these insights together. */
  summary?: string;
  insights: ClusterInsight[];
  headingLevel?: HeadingLevel;
  id?: string;
  className?: string;
}

/** A group of related insights, such as a theme that has emerged across observations. */
export function InsightCluster({ title, summary, insights, headingLevel = 3, id, className }: InsightClusterProps) {
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;
  const Heading = `h${headingLevel}` as HeadingTag;
  return (
    <section id={id} className={cx('fn-cluster', className)} aria-labelledby={titleId}>
      <header className="fn-cluster__header">
        <Heading id={titleId} className="fn-cluster__title">
          {title}
        </Heading>
        <p className="fn-cluster__count">
          {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
        </p>
      </header>
      {summary ? <p className="fn-cluster__summary">{summary}</p> : null}
      <ul className="fn-cluster__list">
        {insights.map((insight) => (
          <li key={insight.id} className="fn-cluster__item">
            <p className="fn-cluster__item-title">
              {insight.href ? <a href={insight.href}>{insight.title}</a> : insight.title}
            </p>
            {insight.summary ? <p className="fn-cluster__item-summary">{insight.summary}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
