'use client';

import { useId, type ReactNode } from 'react';
import { ChevronRightIcon, IntentIcon } from '@fieldnote-ui/icons';
import { THINKING_STAGES, type ThinkingStage } from './stages.js';

export interface KnowledgeNavItem {
  label: string;
  href: string;
  /** Marks the page the user is on. Rendered as aria-current="page". */
  current?: boolean;
  /** Number of items, announced as "n items". */
  count?: number;
}

export interface KnowledgeNavSection {
  /** A thinking stage (groups get the stage's glyph and description) or a custom id. */
  id: ThinkingStage | string;
  /** Required for custom sections; defaults to the stage label. */
  label?: string;
  /** Shown under the heading. Defaults to the stage description. */
  description?: string;
  items: KnowledgeNavItem[];
}

export interface KnowledgeNavProps {
  /** Accessible name of the navigation landmark. */
  label: string;
  sections: KnowledgeNavSection[];
  /** Optional kicker above the sections, e.g. the workspace name. */
  title?: ReactNode;
  className?: string;
}

/**
 * Navigation for knowledge work. Sections follow the thinking loop
 * (Observe → Interpret → Decide → Learn) rather than admin categories.
 * Each section heading is a real heading so the structure is navigable.
 */
export function KnowledgeNav({ label, sections, title, className }: KnowledgeNavProps) {
  const baseId = useId();
  return (
    <nav aria-label={label} className={['fn-nav', className].filter(Boolean).join(' ')}>
      {title ? <p className="fn-nav__title">{title}</p> : null}
      {sections.map((section, index) => {
        const stage = (THINKING_STAGES as Record<string, (typeof THINKING_STAGES)[ThinkingStage]>)[section.id];
        const headingId = `${baseId}-section-${index}`;
        const heading = section.label ?? stage?.label ?? section.id;
        const description = section.description ?? stage?.description;
        return (
          <section key={section.id} aria-labelledby={headingId} className="fn-nav__section" data-stage={stage ? section.id : undefined}>
            <h2 id={headingId} className="fn-nav__heading">
              {stage ? <IntentIcon intent={stage.intent} size={16} /> : null}
              <span>{heading}</span>
            </h2>
            {description ? <p className="fn-nav__description">{description}</p> : null}
            <ul className="fn-nav__list">
              {section.items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="fn-nav__link"
                    aria-current={item.current ? 'page' : undefined}
                  >
                    <span className="fn-nav__link-label">{item.label}</span>
                    {item.count !== undefined ? (
                      <span className="fn-nav__count">
                        {item.count}
                        <span className="fn-sr-only"> {item.count === 1 ? 'item' : 'items'}</span>
                      </span>
                    ) : null}
                    {item.current ? <ChevronRightIcon size={14} className="fn-nav__chevron" /> : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
