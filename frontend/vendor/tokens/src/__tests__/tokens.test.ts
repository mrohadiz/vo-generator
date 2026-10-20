import { describe, expect, it } from 'vitest';
import {
  brand,
  createCssVariables,
  intents,
  lightColors,
  darkColors,
  space,
  tokens,
} from '../index.js';

describe('brand values', () => {
  it('keeps the brief’s hex values verbatim', () => {
    expect(brand).toEqual({
      paper: '#F7F3ED',
      surface: '#FCF9F4',
      textPrimary: '#2A2820',
      textSecondary: '#5D5242',
      border: '#C8BEAF',
      primary: '#4A6B7B',
      success: '#5B7F6A',
    });
    expect(lightColors.paper).toBe(brand.paper);
    expect(lightColors.primary).toBe(brand.primary);
  });

  it('maps the five intents to the brief’s semantic families', () => {
    expect(intents).toEqual(['observation', 'evidence', 'insight', 'decision', 'learning']);
    for (const mode of [lightColors, darkColors]) {
      for (const i of intents) expect(mode.intents[i].accent).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('dark mode is genuinely different from light', () => {
    expect(darkColors.paper).not.toBe(lightColors.paper);
    expect(darkColors.textPrimary).not.toBe(lightColors.textPrimary);
  });
});

describe('spacing scale', () => {
  it('is a 4px-based scale with Tailwind-compatible keys', () => {
    expect(space['1']).toBe(4);
    expect(space['4']).toBe(16);
    expect(space['0.5']).toBe(2);
    expect(space.px).toBe(1);
  });
});

describe('createCssVariables()', () => {
  const css = createCssVariables();

  it('declares light tokens on :root and explicit overrides for each mode', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('[data-theme="light"] {');
    expect(css).toContain('[data-theme="dark"] {');
    expect(css).toContain('--fn-color-paper: #F7F3ED;');
    expect(css).toContain('--fn-color-paper: #171611;');
  });

  it('follows the OS preference when no explicit theme is set', () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(css).toContain(':root:not([data-theme="light"])');
  });

  it('can omit the OS preference block', () => {
    expect(createCssVariables({ systemPreference: false })).not.toContain('prefers-color-scheme');
  });

  it('emits every intent family for both modes', () => {
    for (const i of intents) {
      expect(css).toContain(`--fn-intent-${i}-accent:`);
      expect(css).toContain(`--fn-intent-${i}-text:`);
      expect(css).toContain(`--fn-intent-${i}-tint:`);
      expect(css).toContain(`--fn-intent-${i}-border:`);
    }
  });

  it('collapses motion under prefers-reduced-motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*--fn-duration-base: 0ms;/);
  });

  it('exposes spacing, radius, typography and shadow variables', () => {
    expect(css).toContain('--fn-space-1: 0.25rem;');
    expect(css).toContain('--fn-space-4: 1rem;');
    expect(css).toContain('--fn-radius-lg: 12px;');
    expect(css).toContain('--fn-font-display:');
    expect(css).toContain('--fn-text-base: 1rem;');
    expect(css).toContain('--fn-shadow-md:');
  });

  it('is deterministic', () => {
    expect(createCssVariables()).toBe(css);
  });
});

describe('tokens object', () => {
  it('exposes all required token families', () => {
    expect(Object.keys(tokens)).toEqual(
      expect.arrayContaining(['color', 'intents', 'space', 'radius', 'shadow', 'typography', 'motion', 'breakpoints']),
    );
  });
});

describe('contrast utilities', () => {
  it('computes known WCAG reference ratios', async () => {
    const { contrastRatio } = await import('../index.js');
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('rejects malformed colours', async () => {
    const { relativeLuminance } = await import('../index.js');
    expect(() => relativeLuminance('red')).toThrow();
  });
});
