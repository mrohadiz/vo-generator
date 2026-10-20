import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntentIcon, ObservationIcon, CheckIcon, intentIcons } from '../index.js';

describe('icons', () => {
  it('are decorative (aria-hidden) by default', () => {
    const { container } = render(<CheckIcon />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('expose an accessible name when a title is given', () => {
    const { container } = render(<ObservationIcon title="Observation" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
    expect(svg?.querySelector('title')?.textContent).toBe('Observation');
  });

  it('use currentColor and a 24px grid so they inherit theme colour', () => {
    const { container } = render(<CheckIcon size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('width')).toBe('32');
  });

  it('maps every intent to a distinct glyph', () => {
    const names = Object.values(intentIcons).map((c) => c.displayName);
    expect(new Set(names).size).toBe(5);
  });

  it('IntentIcon renders the glyph for the intent', () => {
    const { container } = render(<IntentIcon intent="decision" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('DecisionIcon');
  });
});
