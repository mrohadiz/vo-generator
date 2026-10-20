'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_STORAGE_KEY,
  THEME_PREFERENCES,
  type ResolvedTheme,
  type ThemePreference,
} from './constants.js';

export interface FieldNoteThemeValue {
  /** What the user asked for: light, dark or follow the system. */
  preference: ThemePreference;
  /** What is actually applied right now. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<FieldNoteThemeValue | null>(null);

const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

/** Reads the OS colour scheme. Returns 'light' on the server. */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia(SYSTEM_QUERY).matches ? 'dark' : 'light';
}

function isPreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export interface FieldNoteProviderProps {
  children: ReactNode;
  /** Preference used before the stored value is read. Default `system`. */
  defaultPreference?: ThemePreference;
  /** localStorage key. Default `fieldnote-theme`. */
  storageKey?: string;
  /** Persist the preference between visits. Default true. */
  persist?: boolean;
}

/**
 * Owns the theme preference and mirrors the resolved theme onto
 * `<html data-theme="light|dark">`, which the generated CSS variables key off.
 */
export function FieldNoteProvider({
  children,
  defaultPreference = 'system',
  storageKey = DEFAULT_STORAGE_KEY,
  persist = true,
}: FieldNoteProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(defaultPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');

  // Hydrate the stored preference after mount (keeps SSR markup deterministic).
  useEffect(() => {
    if (!persist) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (isPreference(stored)) setPreferenceState(stored);
    } catch {
      /* storage unavailable (private mode, sandboxed iframe) — keep default */
    }
  }, [persist, storageKey]);

  // Track the OS preference live.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(SYSTEM_QUERY);
    const sync = () => setSystemTheme(mql.matches ? 'dark' : 'light');
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  // Reflect the resolved theme on <html> so CSS variables switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (!isPreference(next)) return;
      setPreferenceState(next);
      if (persist) {
        try {
          window.localStorage.setItem(storageKey, next);
        } catch {
          /* ignore */
        }
      }
    },
    [persist, storageKey],
  );

  const value = useMemo<FieldNoteThemeValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Access the theme state. Outside a provider it returns a read-only view that
 * follows the OS preference, so components can be used without setup.
 */
export function useFieldNoteTheme(): FieldNoteThemeValue {
  const ctx = useContext(ThemeContext);
  const fallbackResolved = useResolvedColorScheme();
  if (ctx) return ctx;
  return {
    preference: 'system',
    resolvedTheme: fallbackResolved,
    setPreference: () => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[FieldNote] setPreference() called outside <FieldNoteProvider>; ignored.');
      }
    },
  };
}

/**
 * The resolved colour scheme without requiring a provider. Used by charts to
 * choose hex colours (SVG attributes cannot read CSS variables reliably).
 */
export function useResolvedColorScheme(): ResolvedTheme {
  const ctx = useContext(ThemeContext);
  const [system, setSystem] = useState<ResolvedTheme>('light');
  useEffect(() => {
    if (ctx || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(SYSTEM_QUERY);
    const sync = () => setSystem(mql.matches ? 'dark' : 'light');
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [ctx]);
  return ctx ? ctx.resolvedTheme : system;
}
