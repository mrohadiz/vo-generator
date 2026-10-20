'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useResolvedColorScheme } from '@fieldnote-ui/theme';
import { ChartFigure } from '../chart-figure.js';
import { getChartPalette } from '../palette.js';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../tooltip-style.js';
import { describeCategories, formatValue, type LabelledValue } from '../summary.js';

export interface EvidenceChartProps {
  title: string;
  description?: string;
  /** One bar per category, e.g. sources or study types. */
  data: LabelledValue[];
  /** Unit, e.g. "items". */
  unit?: string;
  height?: number;
  className?: string;
}

/** How much evidence sits in each category. Horizontal bars keep long category names readable. */
export function EvidenceChart({ title, description, data, unit = '', height = 280, className }: EvidenceChartProps) {
  const palette = getChartPalette(useResolvedColorScheme());
  return (
    <ChartFigure
      title={title}
      description={description}
      summary={describeCategories(data, unit)}
      height={height}
      className={className}
      table={{ columns: ['Category', unit ? `Count (${unit})` : 'Count'], rows: data.map((d) => [d.label, formatValue(d.value)]) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: palette.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: palette.border }}
          />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: palette.grid, fillOpacity: 0.25 }} />
          <Bar dataKey="value" name={unit || 'Count'} fill={palette.evidence} radius={[0, 2, 2, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
