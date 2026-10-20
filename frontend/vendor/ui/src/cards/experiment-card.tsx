'use client';

import { StatusChip } from '../primitives/status-chip.js';
import type { DateInput, Tone } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';
import { DateValue, MetaList } from './meta-list.js';

export type ExperimentStatus = 'planned' | 'running' | 'concluded' | 'abandoned';

export const EXPERIMENT_STATUS: Record<ExperimentStatus, { label: string; tone: Tone }> = {
  planned: { label: 'Planned', tone: 'neutral' },
  running: { label: 'Running', tone: 'info' },
  concluded: { label: 'Concluded', tone: 'positive' },
  abandoned: { label: 'Abandoned', tone: 'neutral' },
};

export interface ExperimentCardProps extends BaseCardProps {
  /** A falsifiable statement: "If X, then Y, because Z". */
  hypothesis: string;
  /** What is measured. */
  metric?: string;
  status?: ExperimentStatus;
  startedOn?: DateInput;
  endsOn?: DateInput;
  /** Result summary once concluded. */
  result?: string;
}

/** A test of a hypothesis. Experiments are evidence in the making, so they carry the evidence intent. */
export function ExperimentCard({
  title,
  hypothesis,
  metric,
  status = 'planned',
  startedOn,
  endsOn,
  result,
  children,
  ...rest
}: ExperimentCardProps) {
  const meta = EXPERIMENT_STATUS[status];
  return (
    <CardFrame
      title={title}
      intent="evidence"
      kickerLabel="Experiment"
      status={<StatusChip tone={meta.tone}>{meta.label}</StatusChip>}
      footer={
        <MetaList
          items={[
            { label: 'Metric', value: metric },
            { label: 'Started', value: startedOn !== undefined ? <DateValue value={startedOn} /> : null },
            { label: 'Ends', value: endsOn !== undefined ? <DateValue value={endsOn} /> : null },
          ]}
        />
      }
      {...rest}
    >
      <p>
        <span className="fn-label">Hypothesis</span> {hypothesis}
      </p>
      {result ? (
        <p className="fn-experiment__result">
          <span className="fn-label">Result</span> {result}
        </p>
      ) : null}
      {children}
    </CardFrame>
  );
}
