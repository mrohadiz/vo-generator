import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { darkColors as tokenDark, lightColors as tokenLight } from '@fieldnote-ui/tokens';
import {
  DecisionImpactChart,
  EvidenceChart,
  InsightTrendChart,
  LearningChart,
  ObservationChart,
  getChartPalette,
} from '../index.js';
import { describeSeries, describeSigned, formatValue } from '../summary.js';

describe('chart figures', () => {
  it('ObservationChart is a labelled figure with a summary and a data table', () => {
    const { container } = render(
      <ObservationChart
        title="Daily signups"
        description="Counted at midnight UTC."
        unit="signups"
        data={[
          { label: 'Mon', value: 40 },
          { label: 'Tue', value: 22 },
          { label: 'Wed', value: 51 },
        ]}
      />,
    );
    const figure = screen.getByRole('figure', { name: 'Daily signups' });
    expect(figure).toHaveAccessibleDescription('Counted at midnight UTC.');
    const drawing = screen.getByRole('img', { name: /3 points, from Mon \(40 signups\) to Wed \(51 signups\)/ });
    expect(drawing).toHaveTextContent('');
    expect(container.querySelector('details')).not.toBeNull();
    const table = within(figure).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Value (signups)' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Tue' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '51' })).toBeInTheDocument();
  });

  it('EvidenceChart summarises the largest category', () => {
    render(
      <EvidenceChart
        title="Evidence by source"
        data={[
          { label: 'Interviews', value: 6 },
          { label: 'Analytics', value: 14 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: '2 categories. Largest: Analytics at 14.' })).toBeInTheDocument();
  });

  it('InsightTrendChart reports the direction of confidence and formats percentages', () => {
    render(
      <InsightTrendChart
        title="Confidence in hook theory"
        data={[
          { label: 'Week 1', value: 0.4 },
          { label: 'Week 4', value: 0.72 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Confidence rose: 40% at Week 1, 72% at Week 4.' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: '72%' })).toBeInTheDocument();
  });

  it('DecisionImpactChart shows signed values in the table', () => {
    render(
      <DecisionImpactChart
        title="Impact of decisions"
        unit="%"
        data={[
          { label: 'Shorter onboarding', value: 12 },
          { label: 'Extra modal', value: -4 },
        ]}
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: '+12%' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '-4%' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining('Largest positive impact: Shorter onboarding (+12%)'));
  });

  it('LearningChart totals outcomes across periods', () => {
    render(
      <LearningChart
        title="Lessons by outcome"
        data={[
          { label: 'Sep', confirmed: 2, mixed: 1, refuted: 0 },
          { label: 'Oct', confirmed: 1, mixed: 0, refuted: 3 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: '2 periods. Totals: 3 confirmed, 1 mixed, 3 refuted.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Refuted' })).toBeInTheDocument();
  });

  it('handles empty data without throwing', () => {
    render(<ObservationChart title="Empty" data={[]} />);
    expect(screen.getByRole('img', { name: 'No data.' })).toBeInTheDocument();
  });
});

describe('palette and summaries', () => {
  it('chart palette is derived from the same tokens as CSS (light and dark differ)', () => {
    const light = getChartPalette('light');
    const dark = getChartPalette('dark');
    expect(light.observation).toBe(tokenLight.intents.observation.accent);
    expect(dark.insight).toBe(tokenDark.intents.insight.accent);
    expect(light.evidence).not.toBe(dark.evidence);
  });

  it('formatValue rounds, signs and appends units', () => {
    expect(formatValue(1.23456, '%')).toBe('1.23%');
    expect(formatValue(5, 'items')).toBe('5 items');
    expect(formatValue(3, '', true)).toBe('+3');
    expect(formatValue(-3, '', true)).toBe('-3');
  });

  it('describeSeries and describeSigned handle single points', () => {
    expect(describeSeries([{ label: 'A', value: 1 }])).toContain('1 points');
    expect(describeSigned([{ label: 'A', value: 2 }])).toContain('Largest negative impact: A (+2)');
  });
});
