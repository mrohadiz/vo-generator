'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useResolvedColorScheme } from '@fieldnote-ui/theme';
import { ChartFigure } from '../chart-figure.js';
import { getChartPalette } from '../palette.js';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../tooltip-style.js';
import { describeSeries, formatValue, type LabelledValue } from '../summary.js';

export interface ObservationChartProps {
  title: string;
  /** One sentence on what is being counted or measured. */
  description?: string;
  /** Ordered points, e.g. one per day. */
  data: LabelledValue[];
  /** Unit appended to values, e.g. "signups" or "%". */
  unit?: string;
  height?: number;
  className?: string;
}

/** A measurement over time, drawn as a plain line on graph paper. Use it for what was seen, not what it means. */
export function ObservationChart({ title, description, data, unit = '', height = 280, className }: ObservationChartProps) {
  const palette = getChartPalette(useResolvedColorScheme());
  return (
    <ChartFigure
      title={title}
      description={description}
      summary={describeSeries(data, unit)}
      height={height}
      className={className}
      table={{ columns: ['Point', unit ? `Value (${unit})` : 'Value'], rows: data.map((d) => [d.label, formatValue(d.value)]) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: palette.border }} />
          <YAxis tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: palette.border, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={unit || 'Value'}
            stroke={palette.observation}
            strokeWidth={2}
            dot={{ r: 3.5, fill: palette.surface, stroke: palette.observation, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
