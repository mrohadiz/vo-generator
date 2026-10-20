'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useResolvedColorScheme } from '@fieldnote-ui/theme';
import { ChartFigure } from '../chart-figure.js';
import { getChartPalette } from '../palette.js';
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from '../tooltip-style.js';
import type { LabelledValue } from '../summary.js';

export interface InsightTrendChartProps {
  title: string;
  description?: string;
  /** Confidence over time as values from 0 to 1 (0.72 means 72%). */
  data: LabelledValue[];
  height?: number;
  className?: string;
}

const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;

function describeTrend(data: LabelledValue[]): string {
  if (data.length === 0) return 'No data.';
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const delta = last.value - first.value;
  const direction = Math.abs(delta) < 0.02 ? 'held steady' : delta > 0 ? 'rose' : 'fell';
  return `Confidence ${direction}: ${pct(first.value)} at ${first.label}, ${pct(last.value)} at ${last.label}.`;
}

/** How confident an interpretation is, over time. The shaded area shows the level; the axis is fixed to 0–100%. */
export function InsightTrendChart({ title, description, data, height = 280, className }: InsightTrendChartProps) {
  const palette = getChartPalette(useResolvedColorScheme());
  return (
    <ChartFigure
      title={title}
      description={description}
      summary={describeTrend(data)}
      height={height}
      className={className}
      table={{ columns: ['Point', 'Confidence'], rows: data.map((d) => [d.label, pct(d.value)]) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="fn-insight-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.insight} stopOpacity={0.28} />
              <stop offset="100%" stopColor={palette.insight} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: palette.border }} />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(v: number) => pct(v)}
            tick={{ fill: palette.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value) => pct(Number(value))}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Confidence"
            stroke={palette.insight}
            strokeWidth={2}
            fill="url(#fn-insight-trend-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
