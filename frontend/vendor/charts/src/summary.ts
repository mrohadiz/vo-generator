/**
 * Plain-language summaries generated from the data. Every chart exposes one as
 * its accessible name, so the numbers are available without seeing the drawing.
 */
export interface LabelledValue {
  label: string;
  value: number;
}

export function formatValue(value: number, unit = '', signed = false): string {
  const rounded = Math.round(value * 100) / 100;
  const sign = signed && rounded > 0 ? '+' : '';
  const text = `${sign}${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return unit ? `${text}${unit.startsWith('%') ? unit : ` ${unit}`}` : text;
}

export function describeSeries(data: LabelledValue[], unit = ''): string {
  if (data.length === 0) return 'No data.';
  const max = data.reduce((a, b) => (b.value > a.value ? b : a));
  const min = data.reduce((a, b) => (b.value < a.value ? b : a));
  const first = data[0]!;
  const last = data[data.length - 1]!;
  return `${data.length} points, from ${first.label} (${formatValue(first.value, unit)}) to ${last.label} (${formatValue(last.value, unit)}). Highest: ${max.label} at ${formatValue(max.value, unit)}. Lowest: ${min.label} at ${formatValue(min.value, unit)}.`;
}

export function describeCategories(data: LabelledValue[], unit = ''): string {
  if (data.length === 0) return 'No data.';
  const max = data.reduce((a, b) => (b.value > a.value ? b : a));
  return `${data.length} categories. Largest: ${max.label} at ${formatValue(max.value, unit)}.`;
}

export function describeSigned(data: LabelledValue[], unit = ''): string {
  if (data.length === 0) return 'No data.';
  const best = data.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = data.reduce((a, b) => (b.value < a.value ? b : a));
  return `${data.length} decisions. Largest positive impact: ${best.label} (${formatValue(best.value, unit, true)}). Largest negative impact: ${worst.label} (${formatValue(worst.value, unit, true)}).`;
}
