'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { cx } from './util.js';

export interface ChartTable {
  caption?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ChartFigureProps {
  title: string;
  description?: string;
  /** Plain-language summary used as the accessible name of the drawing. */
  summary: string;
  table: ChartTable;
  height?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a chart in a <figure>: caption, drawing, and a collapsible data table.
 * The drawing is role="img" with the summary as its name; the table gives every
 * value to people who cannot, or prefer not to, read the drawing.
 */
export function ChartFigure({ title, description, summary, table, height = 280, className, children }: ChartFigureProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  return (
    <figure className={cx('fn-chart', className)} aria-labelledby={titleId} aria-describedby={description ? descId : undefined}>
      <figcaption className="fn-chart__caption">
        <span id={titleId} className="fn-chart__title">
          {title}
        </span>
        {description ? (
          <span id={descId} className="fn-chart__description">
            {description}
          </span>
        ) : null}
      </figcaption>
      <div className="fn-chart__canvas" role="img" aria-label={summary} style={{ height }}>
        {children}
      </div>
      <details className="fn-chart__table">
        <summary>Show data table</summary>
        <div className="fn-chart__table-scroll">
          <table className="fn-chart__data">
            {table.caption ? <caption>{table.caption}</caption> : null}
            <thead>
              <tr>
                {table.columns.map((column, index) => (
                  <th key={column} scope="col" data-numeric={index > 0 || undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
