import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Width and height in px. Default 20. */
  size?: number;
  /**
   * Accessible name. Omit for decorative icons (the default), which are then
   * hidden from assistive technology. Provide it only when the icon is the
   * sole carrier of meaning.
   */
  title?: string;
}

/**
 * Factory for FieldNote's stroke icons. All icons share a 24px grid, a 1.5
 * stroke and `currentColor`, so they inherit the surrounding text colour and
 * therefore respect light and dark mode.
 */
export function createIcon(displayName: string, paths: ReactNode) {
  function Icon({ size = 20, title, className, ...rest }: IconProps) {
    const labelled = Boolean(title);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        role={labelled ? 'img' : undefined}
        aria-hidden={labelled ? undefined : true}
        className={className ? `fn-icon ${className}` : 'fn-icon'}
        data-icon={displayName}
        {...rest}
      >
        {labelled ? <title>{title}</title> : null}
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
