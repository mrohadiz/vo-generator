import type { Intent } from '@fieldnote-ui/tokens';

/**
 * The thinking loop. FieldNote navigation is organised around how people think,
 * not around administrative sections: notice, weigh, choose, then learn.
 */
export const thinkingStages = ['observe', 'interpret', 'decide', 'learn'] as const;
export type ThinkingStage = (typeof thinkingStages)[number];

export interface ThinkingStageMeta {
  id: ThinkingStage;
  label: string;
  /** What this stage is for, in one sentence. */
  description: string;
  /** Intent whose glyph and colour represent the stage. */
  intent: Intent;
}

export const THINKING_STAGES: Record<ThinkingStage, ThinkingStageMeta> = {
  observe: {
    id: 'observe',
    label: 'Observe',
    description: 'Notice what is happening, before deciding what it means.',
    intent: 'observation',
  },
  interpret: {
    id: 'interpret',
    label: 'Interpret',
    description: 'Weigh the evidence and form insights, with honest confidence.',
    intent: 'insight',
  },
  decide: {
    id: 'decide',
    label: 'Decide',
    description: 'Choose a course of action and record the reasons.',
    intent: 'decision',
  },
  learn: {
    id: 'learn',
    label: 'Learn',
    description: 'Compare what happened with what was expected, and keep the lesson.',
    intent: 'learning',
  },
};
