'use client';

import type { ReactNode } from 'react';
import { cx } from '../shared.js';
import { CardFrame, type BaseCardProps } from './card-frame.js';

export type EvidenceStrength = 'weak' | 'moderate' | 'strong';
export type SourceKind = 'primary' | 'secondary' | 'data' | 'anecdotal';

export interface EvidenceSource {
  label: string;
  href?: string;
  kind?: SourceKind;
}

export interface EvidenceCardProps extends BaseCardProps {
  /** The claim this evidence bears on, stated plainly. */
  claim?: string;
  /** How strong the evidence is for the claim. Shown as text and as bars. */
  strength?: EvidenceStrength;
  sources?: EvidenceSource[];
}

const STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  weak: 'Weak evidence',
  moderate: 'Moderate evidence',
  strong: 'Strong evidence',
};
const STRENGTH_BARS: Record<EvidenceStrength, number> = { weak: 1, moderate: 2, strong: 3 };
const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  data: 'Data',
  anecdotal: 'Anecdotal',
};

/** Something offered in support of, or against, a claim. Shows how strong it is and where it came from. */
export function EvidenceCard({ title, claim, strength, sources = [], children, ...rest }: EvidenceCardProps) {
  const bars = strength ? STRENGTH_BARS[strength] : 0;
  const footer: ReactNode | undefined =
    strength || sources.length > 0 ? (
      <>
        {strength ? (
          <p className="fn-strength" data-level={strength}>
            <span className="fn-strength__bars" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} className={cx('fn-strength__bar', n <= bars && 'is-on')} />
              ))}
            </span>
            <span>{STRENGTH_LABEL[strength]}</span>
          </p>
        ) : null}
        {sources.length > 0 ? (
          <ul className="fn-sources" aria-label="Sources">
            {sources.map((source) => (
              <li key={`${source.label}-${source.href ?? ''}`} className="fn-sources__item">
                {source.href ? <a href={source.href}>{source.label}</a> : <span>{source.label}</span>}
                {source.kind ? <span className="fn-sources__kind">{SOURCE_KIND_LABEL[source.kind]}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </>
    ) : undefined;

  return (
    <CardFrame title={title} intent="evidence" footer={footer} {...rest}>
      {claim ? (
        <p className="fn-evidence__claim">
          <span className="fn-label">Claim</span> {claim}
        </p>
      ) : null}
      {children}
    </CardFrame>
  );
}
