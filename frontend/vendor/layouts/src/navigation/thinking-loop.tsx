'use client';

import { IntentIcon } from '@fieldnote-ui/icons';
import { THINKING_STAGES, thinkingStages, type ThinkingStage } from './stages.js';

export interface ThinkingLoopProps {
  /** Stage to mark as current. */
  current?: ThinkingStage;
  /** Optional links per stage. */
  hrefs?: Partial<Record<ThinkingStage, string>>;
  className?: string;
}

/**
 * The four-stage loop shown as an ordered list. Use it on home pages and
 * in onboarding to explain where a page sits in the thinking process.
 */
export function ThinkingLoop({ current, hrefs = {}, className }: ThinkingLoopProps) {
  return (
    <nav aria-label="Thinking loop" className={['fn-loop', className].filter(Boolean).join(' ')}>
      <ol className="fn-loop__list">
        {thinkingStages.map((stage) => {
          const meta = THINKING_STAGES[stage];
          const isCurrent = current === stage;
          const inner = (
            <>
              <IntentIcon intent={meta.intent} size={20} />
              <span className="fn-loop__label">{meta.label}</span>
              <span className="fn-loop__desc">{meta.description}</span>
            </>
          );
          return (
            <li key={stage} className="fn-loop__item" data-intent={meta.intent}>
              {hrefs[stage] ? (
                <a href={hrefs[stage]} className="fn-loop__link" aria-current={isCurrent ? 'step' : undefined}>
                  {inner}
                </a>
              ) : (
                <span className="fn-loop__link" aria-current={isCurrent ? 'step' : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
