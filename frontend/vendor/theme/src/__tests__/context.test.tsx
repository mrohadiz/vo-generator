import { act, render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FieldNoteProvider, useFieldNoteTheme } from '../context.js';
import { themeInitScript } from '../init-script.js';

type Listener = (e: { matches: boolean }) => void;

function mockMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<Listener>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.includes('dark') ? dark : false;
    },
    media: query,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      dark = next;
      listeners.forEach((l) => l({ matches: next }));
    },
  };
}

function Probe() {
  const { preference, resolvedTheme, setPreference } = useFieldNoteTheme();
  return (
    <div>
      <output data-testid="pref">{preference}</output>
      <output data-testid="resolved">{resolvedTheme}</output>
      <button onClick={() => setPreference('dark')}>dark</button>
      <button onClick={() => setPreference('light')}>light</button>
      <button onClick={() => setPreference('system')}>system</button>
    </div>
  );
}

describe('FieldNoteProvider', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('follows the system preference by default', () => {
    mockMatchMedia(true);
    render(
      <FieldNoteProvider>
        <Probe />
      </FieldNoteProvider>,
    );
    expect(screen.getByTestId('pref').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists an explicit choice and applies it to <html>', () => {
    render(
      <FieldNoteProvider>
        <Probe />
      </FieldNoteProvider>,
    );
    fireEvent.click(screen.getByText('dark'));
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('fieldnote-theme')).toBe('dark');
  });

  it('restores a stored preference after mount', () => {
    window.localStorage.setItem('fieldnote-theme', 'light');
    mockMatchMedia(true);
    render(
      <FieldNoteProvider>
        <Probe />
      </FieldNoteProvider>,
    );
    expect(screen.getByTestId('pref').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem('fieldnote-theme', 'neon');
    render(
      <FieldNoteProvider>
        <Probe />
      </FieldNoteProvider>,
    );
    expect(screen.getByTestId('pref').textContent).toBe('system');
  });

  it('reacts to live OS preference changes when following the system', () => {
    const media = mockMatchMedia(false);
    render(
      <FieldNoteProvider>
        <Probe />
      </FieldNoteProvider>,
    );
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    act(() => media.set(true));
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('does not persist when persist=false', () => {
    render(
      <FieldNoteProvider persist={false}>
        <Probe />
      </FieldNoteProvider>,
    );
    fireEvent.click(screen.getByText('dark'));
    expect(window.localStorage.getItem('fieldnote-theme')).toBeNull();
  });

  it('useFieldNoteTheme works without a provider (read-only fallback)', () => {
    mockMatchMedia(true);
    render(<Probe />);
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });
});

describe('themeInitScript', () => {
  it('returns an inline script that reads the storage key and sets data-theme', () => {
    const src = themeInitScript('my-key');
    expect(src).toContain('"my-key"');
    expect(src).toContain('data-theme');
    expect(src).toContain('prefers-color-scheme: dark');
  });

  it('runs without throwing and applies the stored theme', () => {
    window.localStorage.setItem('fieldnote-theme', 'dark');
    mockMatchMedia(false);
    // eslint-disable-next-line no-new-func
    new Function(themeInitScript())();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
