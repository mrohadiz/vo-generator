import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
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
  Meter,
  NotebookCard,
  ObservationCard,
  ResearchCard,
  ThemeToggle,
  Button,
  IntentBadge,
} from '../index.js';

describe('ObservationCard', () => {
  it('is an article named by its heading and labelled with its intent', () => {
    render(
      <ObservationCard title="Signups dipped on Tuesday" observedAt="2026-10-06" source="Analytics export" subject="Onboarding">
        Signups fell 18% against the four-week average.
      </ObservationCard>,
    );
    const article = screen.getByRole('article', { name: 'Signups dipped on Tuesday' });
    expect(article).toHaveAttribute('data-intent', 'observation');
    expect(within(article).getByText('Observation')).toBeInTheDocument();
    expect(within(article).getByText('Analytics export')).toBeInTheDocument();
    expect(article.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-06T00:00:00.000Z');
  });

  it('honours headingLevel', () => {
    render(<ObservationCard title="Level four" headingLevel={4}>x</ObservationCard>);
    expect(screen.getByRole('heading', { level: 4, name: 'Level four' })).toBeInTheDocument();
  });

  it('defaults to level 3 headings', () => {
    render(<ObservationCard title="Default">x</ObservationCard>);
    expect(screen.getByRole('heading', { level: 3, name: 'Default' })).toBeInTheDocument();
  });
});

describe('EvidenceCard', () => {
  it('states strength in text and lists sources', () => {
    render(
      <EvidenceCard
        title="Survey of 212 readers"
        claim="Readers prefer shorter notes"
        strength="moderate"
        sources={[
          { label: 'Survey export', href: 'https://example.com/survey', kind: 'primary' },
          { label: 'Forum thread', kind: 'anecdotal' },
        ]}
      >
        Two thirds chose the shorter variant.
      </EvidenceCard>,
    );
    expect(screen.getByText('Moderate evidence')).toBeInTheDocument();
    expect(screen.getByText('Readers prefer shorter notes')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Sources' });
    expect(within(list).getByRole('link', { name: 'Survey export' })).toHaveAttribute('href', 'https://example.com/survey');
    expect(within(list).getByText('Anecdotal')).toBeInTheDocument();
  });

  it('marks strength bars as decorative', () => {
    const { container } = render(<EvidenceCard title="t" strength="strong">x</EvidenceCard>);
    expect(container.querySelector('.fn-strength__bars')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.fn-strength__bar.is-on')).toHaveLength(3);
  });
});

describe('InsightCard and Meter', () => {
  it('exposes confidence as a meter with a text value', () => {
    render(<InsightCard title="Short hooks retain better" confidence={0.72} evidenceCount={4}>Pattern across three cohorts.</InsightCard>);
    const meter = screen.getByRole('meter', { name: 'Confidence' });
    expect(meter).toHaveAttribute('aria-valuenow', '0.72');
    expect(meter).toHaveAttribute('aria-valuetext', '72%');
    expect(screen.getByText('Based on 4 pieces of evidence')).toBeInTheDocument();
  });

  it('clamps out-of-range confidence', () => {
    render(<Meter value={3} label="Score" max={1} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '100%');
  });

  it('singular evidence wording', () => {
    render(<InsightCard title="One" evidenceCount={1}>x</InsightCard>);
    expect(screen.getByText('Based on 1 piece of evidence')).toBeInTheDocument();
  });
});

describe('DecisionCard', () => {
  it('marks the chosen option in text, not only in colour', () => {
    const { container } = render(
      <DecisionCard
        title="Pricing tier"
        status="decided"
        question="Which tier should new users see first?"
        options={['Free', 'Team', 'Enterprise']}
        chosen="Team"
        decidedOn="2026-09-30"
        reviewOn="2026-12-01"
      >
        Team converts best in trials.
      </DecisionCard>,
    );
    expect(screen.getByText('Decided')).toBeInTheDocument();
    const chosen = container.querySelector('[data-chosen]');
    expect(chosen?.textContent).toContain('Team');
    expect(chosen?.textContent).toContain('(chosen)');
    expect(screen.getByText('Review by')).toBeInTheDocument();
    expect(screen.getByText('Rationale')).toBeInTheDocument();
  });

  it('defaults to open status', () => {
    render(<DecisionCard title="Undecided">x</DecisionCard>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});

describe('LearningCard', () => {
  it('shows the outcome as text', () => {
    render(<LearningCard title="Hook test" outcome="refuted" appliedTo="Pricing tier">The hook did not matter.</LearningCard>);
    expect(screen.getByText('Outcome: Refuted')).toBeInTheDocument();
    expect(screen.getByText('Pricing tier')).toBeInTheDocument();
  });
});

describe('Knowledge primitives', () => {
  it('ExperimentCard shows status and result', () => {
    render(
      <ExperimentCard title="Tooltip test" hypothesis="If we show a tooltip, drop-off falls." metric="Drop-off rate" status="concluded" result="No measurable change.">
        x
      </ExperimentCard>,
    );
    expect(screen.getByText('Concluded')).toBeInTheDocument();
    expect(screen.getByText('No measurable change.')).toBeInTheDocument();
  });

  it('ResearchCard links its title when href is given (stretched link)', () => {
    render(<ResearchCard title="Attention in notes" question="Do shorter notes get revisited?" href="/research/attention" status="synthesizing" tags={['reading']} sourceCount={9} />);
    expect(screen.getByRole('link', { name: 'Attention in notes' })).toHaveAttribute('href', '/research/attention');
    expect(screen.getByRole('list', { name: 'Topics' })).toBeInTheDocument();
    expect(screen.getByText('Synthesizing')).toBeInTheDocument();
  });

  it('KnowledgeNode renders a link and a link count with correct plural', () => {
    render(<KnowledgeNode title="Evidence hierarchy" kind="Concept" href="/g/evidence" linkCount={1} summary="Not all evidence weighs the same." />);
    expect(screen.getByRole('link', { name: 'Evidence hierarchy' })).toHaveAttribute('href', '/g/evidence');
    expect(screen.getByText('1 link')).toBeInTheDocument();
  });

  it('InsightCluster lists members and counts them', () => {
    render(
      <InsightCluster
        title="Weekend effects"
        insights={[
          { id: 'a', title: 'Saturdays are quieter' },
          { id: 'b', title: 'Sunday evenings peak', href: '/i/b' },
        ]}
      />,
    );
    expect(screen.getByText('2 insights')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sunday evenings peak' })).toBeInTheDocument();
  });

  it('LearningRecord links to the decision it concerns', () => {
    render(
      <LearningRecord title="Tier lesson" outcome="confirmed" recordedOn="2026-10-01" decision={{ label: 'Pricing tier', href: '/d/pricing' }}>
        Team tier converts.
      </LearningRecord>,
    );
    expect(screen.getByRole('link', { name: 'Pricing tier' })).toHaveAttribute('href', '/d/pricing');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('FieldNote is an aside with a default name', () => {
    render(<FieldNote date="2026-10-02">Check this again next month.</FieldNote>);
    expect(screen.getByRole('complementary', { name: 'Field note' })).toBeInTheDocument();
    expect(screen.getByText('Check this again next month.')).toBeInTheDocument();
  });

  it('NotebookCard is a labelled section with a folio', () => {
    render(<NotebookCard title="Week 41" eyebrow="Research notebook" page={12}>Body</NotebookCard>);
    expect(screen.getByRole('region', { name: 'Week 41' })).toBeInTheDocument();
    expect(screen.getByText('p. 12')).toBeInTheDocument();
  });
});

describe('EvidenceTimeline', () => {
  it('renders an ordered list with times and intents', () => {
    render(
      <EvidenceTimeline
        label="History of the tier decision"
        items={[
          { id: '1', at: '2026-09-01', intent: 'observation', title: 'Trial drop-off noticed' },
          { id: '2', at: '2026-09-10', intent: 'evidence', title: 'Interview notes', href: '/e/2' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'History of the tier decision' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByRole('link', { name: 'Interview notes' })).toBeInTheDocument();
    expect(list.querySelectorAll('time')).toHaveLength(2);
  });

  it('shows an empty message when there is nothing to show', () => {
    render(<EvidenceTimeline label="Empty" items={[]} emptyMessage="No history." />);
    expect(screen.getByText('No history.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('DecisionPanel', () => {
  const options = [
    { id: 'free', label: 'Free tier', description: 'Lowest friction.' },
    { id: 'team', label: 'Team tier', description: 'Highest conversion in trials.' },
  ];

  it('is a labelled region with a radio group and keyboard-native options', () => {
    render(<DecisionPanel question="Which tier first?" options={options} />);
    expect(screen.getByRole('region', { name: 'Which tier first?' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleDescription('Lowest friction.');
    expect(screen.getByRole('group', { name: 'Options' })).toBeInTheDocument();
  });

  it('disables submission until an option is chosen, with an explanation', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<DecisionPanel question="Which tier first?" options={options} />);
    const submit = screen.getByRole('button', { name: 'Record decision' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription('Choose an option to record a decision.');
    await user.click(screen.getByRole('radio', { name: /Team tier/ }));
    expect(submit).toBeEnabled();
  });

  it('records the decision with rationale and announces it', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const calls: unknown[] = [];
    render(<DecisionPanel question="Which tier first?" options={options} onDecide={(r) => calls.push(r)} />);
    await user.click(screen.getByRole('radio', { name: /Team tier/ }));
    await user.type(screen.getByRole('textbox', { name: 'Rationale (optional)' }), '  Best trial conversion.  ');
    await user.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ optionId: 'team', rationale: 'Best trial conversion.' });
    expect(screen.getByRole('status')).toHaveTextContent('Recorded: Team tier');
  });

  it('can be navigated with arrow keys within the radio group', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<DecisionPanel question="Q" options={options} defaultOptionId="free" />);
    screen.getByRole('radio', { name: /Free tier/ }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Team tier/ })).toBeChecked();
  });
});

describe('primitives', () => {
  it('Button defaults to type=button and supports variants', () => {
    render(<Button variant="ghost">Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('fn-button--ghost');
  });

  it('IntentBadge renders the intent label', () => {
    render(<IntentBadge intent="learning" />);
    expect(screen.getByText('Learning')).toBeInTheDocument();
  });

  it('ThemeToggle exposes pressed state for each preference', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('group', { name: 'Colour theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });
});
