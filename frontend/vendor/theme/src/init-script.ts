import { DEFAULT_STORAGE_KEY } from './constants.js';

/**
 * Returns a classic inline `<script>` body that sets `data-theme` on `<html>`
 * before first paint, so dark-mode users never see a flash of light paper.
 *
 * Next.js (App Router):
 * ```tsx
 * <head>
 *   <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
 * </head>
 * ```
 */
export function themeInitScript(storageKey: string = DEFAULT_STORAGE_KEY): string {
  const key = JSON.stringify(storageKey);
  return `(function(){try{var p=localStorage.getItem(${key})||'system';var dark=p==='dark'||(p!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`;
}
