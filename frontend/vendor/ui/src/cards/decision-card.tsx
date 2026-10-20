'use client';

import { CheckIcon } from '@fieldnote-ui/icons';
import { StatusChip } from '../primitives/status-chip.js';
import type { DateInput, Tone } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';
import { DateValue, MetaList } from './meta-list.js';

export type DecisionStatus = 'open' | 'deciding' | 'decided' | 'revisited' | 'reversed';

export const DECISION_STATUS: Record<DecisionStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'neutral' },
  deciding: { label: 'Deciding', tone: 'caution' },
  decided: { label: 'Decided', tone: 'positive' },
  revisited: { label: 'Revisited', tone: 'info' },
  reversed: { label: 'Reversed', tone: 'negative' },
};

export interface DecisionCardProps extends BaseCardProps {
  status?: DecisionStatus;
  /** The question being decided, stated as a question. */
  question?: string;
  /** Options considered. */
  options?: string[];
  /** The option that was chosen (must match an entry in `options` to be marked). */
  chosen?: string;
  decidedOn?: DateInput;
  /** When this decision should be reviewed. */
  reviewOn?: DateInput;
}

/** A commitment under consideration or made. Keeps the options, the choice and the review date together. */
export function DecisionCard({
  title,
  status = 'open',
  question,
  options = [],
  chosen,
  decidedOn,
  reviewOn,
  children,
  ...rest
}: DecisionCardProps) {
  const meta = DECISION_STATUS[status];
  return (
    <CardFrame
      title={title}
      intent="decision"
      status={<StatusChip tone={meta.tone}>{meta.label}</StatusChip>}
      footer={
        <MetaList
          items={[
            { label: 'Decided on', value: decidedOn !== undefined ? <DateValue value={decidedOn} /> : null },
            { label: 'Review by', value: reviewOn !== undefined ? <DateValue value={reviewOn} /> : null },
          ]}
        />
      }
      {...rest}
    >
      {question ? <p className="fn-decision__question">{question}</p> : null}
      {options.length > 0 ? (
        <ul className="fn-decision__options" aria-label="Options considered">
          {options.map((option) => {
            const isChosen = chosen !== undefined && option === chosen;
            return (
              <li key={option} className="fn-decision__option" data-chosen={isChosen || undefined}>
                {isChosen ? <CheckIcon size={16} /> : <span className="fn-decision__bullet" aria-hidden="true" />}
                <span>{option}</span>
                {isChosen ? <span className="fn-sr-only">(chosen)</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {children ? (
        <div className="fn-decision__rationale">
          <p className="fn-label">Rationale</p>
          {children}
        </div>
      ) : null}
    </CardFrame>
  );
}
