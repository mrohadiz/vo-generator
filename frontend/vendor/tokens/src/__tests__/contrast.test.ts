import { describe, expect, it } from 'vitest';
import { darkColors, intents, lightColors, type ColorScheme } from '../colors.js';

/** WCAG 2.x relative luminance and contrast ratio. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const textPairs = (s: ColorScheme) => {
  const backgrounds = { paper: s.paper, surface: s.surface, surfaceSunken: s.surfaceSunken };
  const pairs: Array<[string, string, string]> = [];
  for (const [bgName, bg] of Object.entries(backgrounds)) {
    for (const fg of ['textPrimary', 'textSecondary', 'textTertiary', 'successText', 'dangerText', 'primary'] as const) {
      pairs.push([`${fg} on ${bgName}`, s[fg], bg]);
    }
  }
  pairs.push(['onPrimary on primary', s.onPrimary, s.primary]);
  for (const intent of intents) {
    const c = s.intents[intent];
    pairs.push([`${intent}.text on paper`, c.text, s.paper]);
    pairs.push([`${intent}.text on surface`, c.text, s.surface]);
    pairs.push([`${intent}.text on tint`, c.text, c.tint]);
  }
  return pairs;
};

const nonTextPairs = (s: ColorScheme) => {
  const pairs: Array<[string, string, string]> = [
    ['focus on paper', s.focus, s.paper],
    ['focus on surface', s.focus, s.surface],
    ['borderStrong on surface', s.borderStrong, s.surface],
    ['borderStrong on paper', s.borderStrong, s.paper],
  ];
  for (const intent of intents) {
    pairs.push([`${intent}.accent on paper`, s.intents[intent].accent, s.paper]);
    pairs.push([`${intent}.accent on surface`, s.intents[intent].accent, s.surface]);
  }
  return pairs;
};

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s colour contrast (WCAG 2.2 AA)', (_mode, scheme) => {
  it.each(textPairs(scheme))('text: %s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(nonTextPairs(scheme))('non-text: %s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('primary button text contrast', () => {
  it('light and dark on-primary meet AA', () => {
    expect(contrast(lightColors.onPrimary, lightColors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkColors.onPrimary, darkColors.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
