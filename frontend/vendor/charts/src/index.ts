/**
 * @fieldnote-ui/charts — notebook-styled charts with accessible summaries and data tables.
 *
 * Import the stylesheet once: `import '@fieldnote-ui/charts/styles.css'`.
 * Charts follow the resolved light/dark scheme automatically when wrapped in a
 * `FieldNoteProvider` (or when the OS preference is used).
 */
export { ObservationChart, type ObservationChartProps } from './charts/observation-chart.js';
export { EvidenceChart, type EvidenceChartProps } from './charts/evidence-chart.js';
export { InsightTrendChart, type InsightTrendChartProps } from './charts/insight-trend-chart.js';
export { DecisionImpactChart, type DecisionImpactChartProps } from './charts/decision-impact-chart.js';
export { LearningChart, type LearningChartProps, type LearningOutcomeCounts } from './charts/learning-chart.js';
export { ChartFigure, type ChartFigureProps, type ChartTable } from './chart-figure.js';
export { getChartPalette, type ChartPalette } from './palette.js';
export { describeSeries, describeCategories, describeSigned, type LabelledValue } from './summary.js';
