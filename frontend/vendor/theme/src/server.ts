/**
 * Server-safe entry point. No "use client" directive: these helpers can be
 * called from React Server Components (e.g. to render the no-flash script in
 * the root layout). Do not import hooks or components from here.
 */
export { themeInitScript } from './init-script.js';
export {
  DEFAULT_STORAGE_KEY,
  THEME_PREFERENCES,
  type ResolvedTheme,
  type ThemePreference,
} from './constants.js';
