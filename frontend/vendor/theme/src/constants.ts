/** Default localStorage key for the persisted theme preference. */
export const DEFAULT_STORAGE_KEY = 'fieldnote-theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];
