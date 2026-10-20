'use client';

import type { DateInput } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';
import { DateValue, MetaList } from './meta-list.js';

export interface ObservationCardProps extends BaseCardProps {
  /** When the thing was observed. */
  observedAt?: DateInput;
  /** Where the observation came from (a person, instrument, feed). */
  source?: string;
  /** What the observation is about. */
  subject?: string;
}

/**
 * Something that was noticed — before any interpretation. Keep the text
 * descriptive: what happened, not what it means.
 */
export function ObservationCard({ title, observedAt, source, subject, children, ...rest }: ObservationCardProps) {
  return (
    <CardFrame
      intent="observation"
      title={title}
      footer={
        <MetaList
          items={[
            { label: 'Observed', value: observedAt !== undefined ? <DateValue value={observedAt} /> : null },
            { label: 'Subject', value: subject },
            { label: 'Source', value: source },
          ]}
        />
      }
      {...rest}
    >
      {children}
    </CardFrame>
  );
}
