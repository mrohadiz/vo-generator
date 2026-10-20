'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useResolvedColorScheme } from '@fieldnote-ui/theme';
import { ChartFigure } from '../chart-figure.js';
import { getChartPalette } from '../palette.js';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../tooltip-style.js';

export interface LearningOutcomeCounts {
  /** Period or topic the lessons belong to. */
  label: string;
  confirmed: number;
  mixed: number;
  refuted: number;
}

export interface LearningChartProps {
  title: string;
  description?: string;
  /** Lessons recorded per period, split by whether the expectation held. */
  data: LearningOutcomeCounts[];
  height?: number;
  className?: string;
}

function describeOutcomes(data: LearningOutcomeCounts[]): string {
  if (data.length === 0) return 'No data.';
  const sum = (k: 'confirmed' | 'mixed' | 'refuted') => data.reduce((a, d) => a + d[k], 0);
  return `${data.length} periods. Totals: ${sum('confirmed')} confirmed, ${sum('mixed')} mixed, ${sum('refuted')} refuted.`;
}

/** Lessons learned, split by outcome. Confirmed expectations and refuted ones are both useful; the chart shows the balance. */
export function LearningChart({ title, description, data, height = 280, className }: LearningChartProps) {
  const palette = getChartPalette(useResolvedColorScheme());
  return (
    <ChartFigure
      title={title}
      description={description}
      summary={describeOutcomes(data)}
      height={height}
      className={className}
      table={{
        columns: ['Period', 'Confirmed', 'Mixed', 'Refuted'],
        rows: data.map((d) => [d.label, d.confirmed, d.mixed, d.refuted]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: palette.border }} />
          <YAxis allowDecimals={false} tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: palette.grid, fillOpacity: 0.25 }} />
          <Legend wrapperStyle={{ fontSize: 12, color: palette.label }} iconType="square" />
          <Bar dataKey="confirmed" name="Confirmed" stackId="outcome" fill={palette.outcome.confirmed} maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey="mixed" name="Mixed" stackId="outcome" fill={palette.outcome.mixed} maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey="refuted" name="Refuted" stackId="outcome" fill={palette.outcome.refuted} maxBarSize={36} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
