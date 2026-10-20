import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import {
  Button,
  DecisionCard,
  DecisionPanel,
  EvidenceCard,
  EvidenceTimeline,
  ExperimentCard,
  FieldNote,
  InsightCard,
  InsightCluster,
  KnowledgeNode,
  LearningCard,
  LearningRecord,
  NotebookCard,
  ObservationCard,
  ResearchCard,
  ThemeToggle,
} from '../index.js';

/**
 * Runs axe-core against every component in one page.
 * Colour contrast is verified by the token suite (jsdom has no layout engine),
 * so the colour-contrast rule is disabled here and documented in docs/accessibility.
 */
async function audit(node: HTMLElement) {
  const results = await axe.run(node, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
    resultTypes: ['violations'],
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

describe('axe-core accessibility audit', () => {
  it('every component renders without WCAG violations (as a page section)', async () => {
    const { container } = render(
      <main>
        <h1>Composite page</h1>
        <ThemeToggle />
        <NotebookCard title="Week 41" eyebrow="Notebook" page={3}>
          <ObservationCard title="Observation A" observedAt="2026-10-01" source="Export">
            Signups fell.
          </ObservationCard>
          <EvidenceCard title="Evidence B" claim="Claim" strength="weak" sources={[{ label: 'Doc', href: '#doc', kind: 'data' }]}>
            Detail
          </EvidenceCard>
          <InsightCard title="Insight C" confidence={0.5} evidenceCount={2}>
            Pattern
          </InsightCard>
          <DecisionCard title="Decision D" status="decided" options={['A', 'B']} chosen="B" question="Pick?" decidedOn="2026-10-02">
            Because.
          </DecisionCard>
          <LearningCard title="Learning E" outcome="mixed" recordedOn="2026-10-03">
            Lesson.
          </LearningCard>
          <ExperimentCard title="Experiment F" hypothesis="If x then y" metric="Clicks" status="running" />
          <ResearchCard title="Research G" question="Why?" href="#r" tags={['a']} status="exploring" />
          <KnowledgeNode title="Node H" kind="Concept" href="#n" linkCount={2} summary="s" />
          <InsightCluster title="Cluster I" insights={[{ id: '1', title: 'One', href: '#1' }]} />
          <LearningRecord title="Record J" outcome="refuted" recordedOn="2026-10-04" decision={{ label: 'D', href: '#d' }}>
            Lesson
          </LearningRecord>
          <FieldNote title="Note K" date="2026-10-05">
            Margin note.
          </FieldNote>
          <EvidenceTimeline
            label="Timeline L"
            items={[
              { id: 'a', at: '2026-09-01', intent: 'observation', title: 'First' },
              { id: 'b', at: '2026-09-02', intent: 'insight', title: 'Second', href: '#2' },
            ]}
          />
          <DecisionPanel question="Which option?" options={[{ id: 'x', label: 'X', description: 'desc' }, { id: 'y', label: 'Y' }]} />
          <div>
            <Button>Primary action</Button> <Button variant="secondary">Secondary</Button>
          </div>
        </NotebookCard>
      </main>,
    );
    expect(await audit(container)).toEqual([]);
  });

  it('decision panel alone has no violations when disabled', async () => {
    const { container } = render(
      <DecisionPanel question="Locked?" disabled options={[{ id: 'a', label: 'A' }]} />,
    );
    expect(await audit(container)).toEqual([]);
  });
});

describe('axe-core negative control', () => {
  it('detects a deliberately inaccessible control, so the audit is not vacuous', async () => {
    const { container } = render(
      <div>
        <img src="x.png" />
        <button type="button" />
      </div>,
    );
    const violations = await audit(container);
    expect(violations.join('\n')).toMatch(/image-alt/);
    expect(violations.join('\n')).toMatch(/button-name/);
  });
});
