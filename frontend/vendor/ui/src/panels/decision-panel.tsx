'use client';

import { useId, useState, type FormEvent } from 'react';
import { CheckIcon } from '@fieldnote-ui/icons';
import { Button } from '../primitives/button.js';
import { IntentBadge } from '../primitives/intent-badge.js';
import { cx, type HeadingLevel, type HeadingTag } from '../shared.js';

export interface DecisionOption {
  id: string;
  label: string;
  /** What choosing this option would mean. */
  description?: string;
}

export interface DecisionResult {
  optionId: string;
  option: DecisionOption;
  rationale: string;
  /** ISO timestamp of when the decision was recorded in this session. */
  recordedAt: string;
}

export interface DecisionPanelProps {
  /** The question, phrased as a question. */
  question: string;
  options: DecisionOption[];
  /** Pre-selected option. */
  defaultOptionId?: string;
  /** Label of the submit button. Default "Record decision". */
  submitLabel?: string;
  /** Label of the rationale field. Default "Rationale (optional)". */
  rationaleLabel?: string;
  /** Called when a decision is recorded. */
  onDecide?: (result: DecisionResult) => void;
  /** Prevents any change. Useful for a closed decision. */
  disabled?: boolean;
  headingLevel?: HeadingLevel;
  /** Name of the radio group. Defaults to a unique id. */
  name?: string;
  id?: string;
  className?: string;
}

/**
 * An interactive decision point. Options are a native radio group (keyboard
 * arrows work out of the box), the rationale is captured with the choice, and
 * confirmation is announced through a live region.
 */
export function DecisionPanel({
  question,
  options,
  defaultOptionId,
  submitLabel = 'Record decision',
  rationaleLabel = 'Rationale (optional)',
  onDecide,
  disabled = false,
  headingLevel = 2,
  name,
  id,
  className,
}: DecisionPanelProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const titleId = `${baseId}-title`;
  const rationaleId = `${baseId}-rationale`;
  const hintId = `${baseId}-hint`;
  const groupName = name ?? `${baseId}-option`;
  const Heading = `h${headingLevel}` as HeadingTag;

  const [selected, setSelected] = useState<string>(defaultOptionId ?? '');
  const [rationale, setRationale] = useState('');
  const [recorded, setRecorded] = useState<DecisionResult | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const option = options.find((o) => o.id === selected);
    if (!option || disabled) return;
    const result: DecisionResult = {
      optionId: option.id,
      option,
      rationale: rationale.trim(),
      recordedAt: new Date().toISOString(),
    };
    setRecorded(result);
    onDecide?.(result);
  };

  return (
    <section id={id} className={cx('fn-decision-panel', className)} aria-labelledby={titleId}>
      <div className="fn-decision-panel__header">
        <IntentBadge intent="decision" />
      </div>
      <Heading id={titleId} className="fn-decision-panel__question">
        {question}
      </Heading>

      <form className="fn-decision-panel__form" onSubmit={handleSubmit} aria-describedby={hintId}>
        <fieldset className="fn-decision-panel__options" disabled={disabled}>
          <legend className="fn-legend">Options</legend>
          {options.map((option) => {
            const descId = option.description ? `${baseId}-${option.id}-desc` : undefined;
            const isSelected = selected === option.id;
            return (
              <label key={option.id} className="fn-option" data-selected={isSelected || undefined}>
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setSelected(option.id)}
                  aria-describedby={descId}
                />
                <span className="fn-option__text">
                  <span className="fn-option__label">{option.label}</span>
                  {option.description ? (
                    <span id={descId} className="fn-option__desc">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="fn-field">
          <label htmlFor={rationaleId} className="fn-label">
            {rationaleLabel}
          </label>
          <textarea
            id={rationaleId}
            className="fn-textarea"
            rows={3}
            value={rationale}
            disabled={disabled}
            onChange={(e) => setRationale(e.target.value)}
          />
        </div>

        <div className="fn-decision-panel__actions">
          <Button type="submit" disabled={disabled || !selected} aria-describedby={hintId}>
            {submitLabel}
          </Button>
          <p id={hintId} className="fn-hint">
            {selected ? 'Your choice and rationale are recorded together.' : 'Choose an option to record a decision.'}
          </p>
        </div>
      </form>

      <div role="status" className="fn-decision-panel__status">
        {recorded ? (
          <p>
            <CheckIcon size={16} /> Recorded: <strong>{recorded.option.label}</strong>
          </p>
        ) : null}
      </div>
    </section>
  );
}
