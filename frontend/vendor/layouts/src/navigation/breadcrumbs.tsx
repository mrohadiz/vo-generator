'use client';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Hierarchical location. The last item is the current page (aria-current="page"). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={['fn-breadcrumbs', className].filter(Boolean).join(' ')}>
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="fn-breadcrumbs__sep">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
