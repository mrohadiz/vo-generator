'use client';

import { clamp01 } from '../shared.js';
import { Meter } from '../primitives/meter.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';

export interface InsightCardProps extends BaseCardProps {
  /** Confidence in the insight, 0 to 1. Shown as a meter and as a percentage. */
  confidence?: number;
  /** How many pieces of evidence support this insight. */
  evidenceCount?: number;
}

/** An interpretation: a pattern or meaning drawn from observations. Always shows how sure we are. */
export function InsightCard({ title, confidence, evidenceCount, children, ...rest }: InsightCardProps) {
  const hasConfidence = typeof confidence === 'number' && !Number.isNaN(confidence);
  const footer =
    hasConfidence || evidenceCount !== undefined ? (
      <div className="fn-insight__footer">
        {hasConfidence ? <Meter value={clamp01(confidence)} label="Confidence" /> : null}
        {evidenceCount !== undefined ? (
          <p className="fn-caption">
            Based on {evidenceCount} {evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
          </p>
        ) : null}
      </div>
    ) : undefined;
  return (
    <CardFrame title={title} intent="insight" footer={footer} {...rest}>
      {children}
    </CardFrame>
  );
}
