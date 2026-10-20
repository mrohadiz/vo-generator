'use client';

import { StatusChip } from '../primitives/status-chip.js';
import { Tag } from '../primitives/tag.js';
import type { DateInput, Tone } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';
import { DateValue, MetaList } from './meta-list.js';

export type ResearchStatus = 'exploring' | 'synthesizing' | 'settled';

export const RESEARCH_STATUS: Record<ResearchStatus, { label: string; tone: Tone }> = {
  exploring: { label: 'Exploring', tone: 'info' },
  synthesizing: { label: 'Synthesizing', tone: 'caution' },
  settled: { label: 'Settled', tone: 'positive' },
};

export interface ResearchCardProps extends BaseCardProps {
  /** The open question this research is trying to answer. */
  question: string;
  status?: ResearchStatus;
  tags?: string[];
  sourceCount?: number;
  updatedOn?: DateInput;
  /** Makes the title a link to the research workspace. */
  href?: string;
}

/** A line of inquiry. Shows the question, where it stands, and how much has been gathered. */
export function ResearchCard({
  title,
  question,
  status = 'exploring',
  tags = [],
  sourceCount,
  updatedOn,
  href,
  children,
  ...rest
}: ResearchCardProps) {
  const meta = RESEARCH_STATUS[status];
  return (
    <CardFrame
      title={title}
      titleContent={href ? <a href={href} className="fn-stretched">{title}</a> : undefined}
      intent="evidence"
      kickerLabel="Research"
      status={<StatusChip tone={meta.tone}>{meta.label}</StatusChip>}
      footer={
        <>
          {tags.length > 0 ? (
            <ul className="fn-tags" aria-label="Topics">
              {tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          ) : null}
          <MetaList
            items={[
              { label: 'Sources', value: sourceCount },
              { label: 'Updated', value: updatedOn !== undefined ? <DateValue value={updatedOn} /> : null },
            ]}
          />
        </>
      }
      {...rest}
    >
      <p>
        <span className="fn-label">Question</span> {question}
      </p>
      {children}
    </CardFrame>
  );
}
