'use client';

import { IntentIcon } from '@fieldnote-ui/icons';
import type { Intent } from '@fieldnote-ui/tokens';
import { INTENT_LABELS, cx } from '../shared.js';

export interface IntentBadgeProps {
  intent: Intent;
  /** Overrides the default label, e.g. "Experiment" for an evidence-coloured kicker. */
  label?: string;
  className?: string;
}

/**
 * The kicker that names the thinking mode of a card. The text label is always
 * rendered: colour is never the only carrier of meaning.
 */
export function IntentBadge({ intent, label, className }: IntentBadgeProps) {
  return (
    <span className={cx('fn-intent', className)} data-intent={intent}>
      <IntentIcon intent={intent} size={14} />
      <span>{label ?? INTENT_LABELS[intent]}</span>
    </span>
  );
}
