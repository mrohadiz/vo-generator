'use client';

import { StatusChip } from '../primitives/status-chip.js';
import type { DateInput, Tone } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';
import { DateValue, MetaList } from './meta-list.js';

export type LearningOutcome = 'pending' | 'confirmed' | 'mixed' | 'refuted';

export const LEARNING_OUTCOME: Record<LearningOutcome, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  confirmed: { label: 'Confirmed', tone: 'positive' },
  mixed: { label: 'Mixed', tone: 'caution' },
  refuted: { label: 'Refuted', tone: 'negative' },
};

export interface LearningCardProps extends BaseCardProps {
  /** Whether the expectation held. */
  outcome?: LearningOutcome;
  /** What we now believe or will do differently. */
  recordedOn?: DateInput;
  /** Where the lesson is applied, e.g. a decision or project. */
  appliedTo?: string;
}

/** What we learned from an outcome. Records whether the expectation held, so future decisions can lean on it. */
export function LearningCard({ title, outcome = 'pending', recordedOn, appliedTo, children, ...rest }: LearningCardProps) {
  const meta = LEARNING_OUTCOME[outcome];
  return (
    <CardFrame
      title={title}
      intent="learning"
      status={<StatusChip tone={meta.tone}>Outcome: {meta.label}</StatusChip>}
      footer={
        <MetaList
          items={[
            { label: 'Recorded', value: recordedOn !== undefined ? <DateValue value={recordedOn} /> : null },
            { label: 'Applied to', value: appliedTo },
          ]}
        />
      }
      {...rest}
    >
      {children}
    </CardFrame>
  );
}
