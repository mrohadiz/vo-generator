import { Button } from '@fieldnote-ui/ui';
import type { Mode } from '../types';

const TABS: Array<{ id: Mode; label: string; hint: string }> = [
  { id: 'single', label: 'Tanpa scene', hint: 'Satu audio utuh' },
  { id: 'scene', label: 'Dengan scene', hint: 'Satu audio per scene' },
  { id: 'theater', label: 'Teater', hint: 'Banyak tokoh, suara sendiri' },
];

export function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Mode narasi"
      className="flex flex-wrap gap-2 rounded-[var(--fn-radius-lg)] border border-fn-border bg-fn-surface-sunken p-1.5"
    >
      {TABS.map((tab) => {
        const active = mode === tab.id;
        return (
          <Button
            key={tab.id}
            role="tab"
            aria-selected={active}
            variant={active ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onChange(tab.id)}
            className="flex-1"
            style={{ minWidth: '9rem', justifyContent: 'center' }}
          >
            <span className="flex flex-col items-center text-center leading-tight">
              <span style={{ fontWeight: 'var(--fn-weight-semibold)' }}>{tab.label}</span>
              <span style={{ fontSize: 'var(--fn-text-xs)', opacity: 0.75 }}>{tab.hint}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
