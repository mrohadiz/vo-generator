/**
 * @fieldnote-ui/theme — theme state, a no-flash init script and global styles.
 *
 * ```tsx
 * import '@fieldnote-ui/theme/styles.css';
 * import { FieldNoteProvider, useFieldNoteTheme } from '@fieldnote-ui/theme';
 * ```
 */
export { FieldNoteProvider, useFieldNoteTheme, useResolvedColorScheme, getSystemTheme } from './context.js';
export type { FieldNoteProviderProps, FieldNoteThemeValue } from './context.js';
export { themeInitScript } from './init-script.js';
export {
  DEFAULT_STORAGE_KEY,
  THEME_PREFERENCES,
  type ResolvedTheme,
  type ThemePreference,
} from './constants.js';
