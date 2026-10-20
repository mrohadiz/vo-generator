import { breakpoints } from './breakpoints.js';
import { colors, intents, type ColorScheme } from './colors.js';
import { motion } from './animation.js';
import { radius } from './radius.js';
import { shadow } from './shadow.js';
import { space } from './spacing.js';
import { fontFamily, fontSize, fontWeight, letterSpacing, textRoles } from './typography.js';

/** The complete FieldNote token set as a single object. */
export const tokens = {
  name: 'fieldnote',
  color: colors,
  intents,
  space,
  radius,
  shadow,
  typography: {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    textRoles,
  },
  motion,
  breakpoints,
} as const;

export type FieldNoteTokens = typeof tokens;
export type { ColorScheme };
