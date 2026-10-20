'use client';

export interface SkipLinkProps {
  /** Id of the element to skip to. Default "main". */
  targetId?: string;
  children?: string;
}

/** First focusable element on a FieldNote page. Lets keyboard users bypass navigation. */
export function SkipLink({ targetId = 'main', children = 'Skip to content' }: SkipLinkProps) {
  return (
    <a className="fn-skip-link" href={`#${targetId}`}>
      {children}
    </a>
  );
}
