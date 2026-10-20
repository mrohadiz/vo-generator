'use client';

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useResolvedColorScheme } from '@fieldnote-ui/theme';
import { ChartFigure } from '../chart-figure.js';
import { getChartPalette } from '../palette.js';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../tooltip-style.js';
import { describeSigned, formatValue, type LabelledValue } from '../summary.js';

export interface DecisionImpactChartProps {
  title: string;
  description?: string;
  /** Signed impact per decision: positive helped, negative hurt. Zero is the baseline. */
  data: LabelledValue[];
  /** Unit, e.g. "%" or "signups". */
  unit?: string;
  height?: number;
  className?: string;
}

/**
 * The measured effect of each decision around a zero baseline. Positive and
 * negative effects are distinguished by colour AND by sign in the labels and table.
 */
export function DecisionImpactChart({ title, description, data, unit = '', height = 280, className }: DecisionImpactChartProps) {
  const palette = getChartPalette(useResolvedColorScheme());
  return (
    <ChartFigure
      title={title}
      description={description}
      summary={describeSigned(data, unit)}
      height={height}
      className={className}
      table={{
        columns: ['Decision', unit ? `Impact (${unit})` : 'Impact'],
        rows: data.map((d) => [d.label, formatValue(d.value, unit, true)]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" width={120} tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: palette.border }} />
          <ReferenceLine x={0} stroke={palette.border} strokeWidth={1.5} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value) => formatValue(Number(value), unit, true)}
            cursor={{ fill: palette.grid, fillOpacity: 0.25 }}
          />
          <Bar dataKey="value" name={unit || 'Impact'} radius={[2, 2, 2, 2]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.value >= 0 ? palette.decision : palette.observation} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
