'use client';

import type { Intent } from '@fieldnote-ui/tokens';
import type { ComponentType } from 'react';
import type { IconProps } from './create-icon.js';
import { DecisionIcon, EvidenceIcon, InsightIcon, LearningIcon, ObservationIcon } from './icons.js';

export const intentIcons: Record<Intent, ComponentType<IconProps>> = {
  observation: ObservationIcon,
  evidence: EvidenceIcon,
  insight: InsightIcon,
  decision: DecisionIcon,
  learning: LearningIcon,
};

/** Renders the glyph for a FieldNote intent. */
export function IntentIcon({ intent, ...props }: IconProps & { intent: Intent }) {
  const Icon = intentIcons[intent];
  return <Icon {...props} />;
}
