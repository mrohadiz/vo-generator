'use client';

import type { ReactNode } from 'react';
import { formatDate, type DateInput } from '../shared.js';

export interface MetaItem {
  label: string;
  value: ReactNode | undefined | null | false;
}

/** Definition list of label / value metadata, used in card footers. */
export function MetaList({ items }: { items: MetaItem[] }) {
  const visible = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== false && item.value !== '');
  if (visible.length === 0) return null;
  return (
    <dl className="fn-meta">
      {visible.map((item) => (
        <div key={item.label} className="fn-meta__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A `<time>` element for a date input, formatted in UTC. */
export function DateValue({ value }: { value: DateInput }) {
  const { dateTime, label } = formatDate(value);
  return <time dateTime={dateTime}>{label}</time>;
}
