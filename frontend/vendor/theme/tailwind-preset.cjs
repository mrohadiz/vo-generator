/**
 * FieldNote Tailwind preset (Tailwind v3).
 *
 *   // tailwind.config.js
 *   module.exports = {
 *     presets: [require('@fieldnote-ui/theme/tailwind-preset')],
 *     content: ['./src/**\/*.{ts,tsx}', './node_modules/@fieldnote-ui/**\/dist/**\/*.js'],
 *   };
 *
 * Every value points at a CSS custom property, so utilities such as `bg-fn-paper`
 * or `text-fn-observation-text` automatically follow light and dark mode.
 */
const { space, radius, shadow, fontFamily, fontSize, fontWeight, letterSpacing, motion, measure, breakpoints, intents } =
  require('@fieldnote-ui/tokens');

const v = (name) => `var(--fn-${name})`;

const spacing = Object.fromEntries(Object.keys(space).map((k) => [k, v(`space-${k.replace('.', '-')}`)]));

const intentColors = Object.fromEntries(
  intents.map((i) => [
    i,
    {
      DEFAULT: v(`intent-${i}-accent`),
      text: v(`intent-${i}-text`),
      tint: v(`intent-${i}-tint`),
      border: v(`intent-${i}-border`),
    },
  ]),
);

module.exports = {
  theme: {
    screens: Object.fromEntries(Object.entries(breakpoints).map(([k, px]) => [k, `${px}px`])),
    extend: {
      colors: {
        fn: {
          paper: v('color-paper'),
          surface: v('color-surface'),
          'surface-sunken': v('color-surface-sunken'),
          'text-primary': v('color-text-primary'),
          'text-secondary': v('color-text-secondary'),
          'text-tertiary': v('color-text-tertiary'),
          border: v('color-border'),
          'border-strong': v('color-border-strong'),
          primary: v('color-primary'),
          'primary-hover': v('color-primary-hover'),
          'on-primary': v('color-on-primary'),
          success: v('color-success'),
          'success-text': v('color-success-text'),
          danger: v('color-danger'),
          'danger-text': v('color-danger-text'),
          focus: v('color-focus'),
          ...intentColors,
        },
      },
      spacing,
      borderRadius: Object.fromEntries(Object.keys(radius).map((k) => [k, v(`radius-${k}`)])),
      boxShadow: Object.fromEntries(Object.keys(shadow.light).map((k) => [`fn-${k}`, v(`shadow-${k}`)])),
      fontFamily: {
        'fn-display': v('font-display'),
        'fn-body': v('font-body'),
        'fn-mono': v('font-mono'),
      },
      fontSize: Object.fromEntries(
        Object.keys(fontSize).map((k) => [k, [v(`text-${k}`), { lineHeight: v(`leading-${k}`) }]]),
      ),
      fontWeight: Object.fromEntries(Object.keys(fontWeight).map((k) => [`fn-${k}`, v(`weight-${k}`)])),
      letterSpacing: Object.fromEntries(Object.keys(letterSpacing).map((k) => [`fn-${k}`, v(`tracking-${k}`)])),
      transitionDuration: Object.fromEntries(Object.keys(motion.duration).map((k) => [k, v(`duration-${k}`)])),
      transitionTimingFunction: Object.fromEntries(Object.keys(motion.easing).map((k) => [k, v(`ease-${k}`)])),
      maxWidth: {
        'fn-prose': measure.prose,
        'fn-page': measure.page,
        'fn-canvas': measure.canvas,
        'fn-conversation': measure.conversation,
      },
      outlineColor: { fn: v('color-focus') },
    },
  },
  plugins: [],
};
