/** Komponen kecil yang menyusun tampilan aplikasi di atas FieldNote UI. */

import type { ReactNode } from 'react';
import { StatusChip } from '@fieldnote-ui/ui';

export function Card({
  title,
  actions,
  children,
  tight,
  id,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
  id?: string;
}) {
  return (
    <section className="fn-card" id={id}>
      {(title || actions) && (
        <div className="fn-card__head">
          {typeof title === 'string' ? <h2 className="fn-card__title">{title}</h2> : title}
          {actions ? <div className="fn-row">{actions}</div> : null}
        </div>
      )}
      <div className={tight ? 'fn-card__body fn-card__body--tight' : 'fn-card__body'}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="fn-field">
      <label className="fn-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className="fn-meta">{hint}</span> : null}
    </div>
  );
}

export function Notice({
  tone = 'warning',
  children,
}: {
  tone?: 'warning' | 'info' | 'danger';
  children: ReactNode;
}) {
  const cls = tone === 'info' ? 'fn-note fn-note--info' : tone === 'danger' ? 'fn-note fn-note--danger' : 'fn-note';
  return (
    <div className={cls} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Baris audio: pemutar langsung, unduh, buka di tab terpisah, dan hapus. */
export function AudioRow({ url, name, onDelete }: { url: string; name?: string; onDelete?: () => void }) {
  return (
    <div className="fn-audio-row">
      <audio controls preload="none" src={url} />
      {name ? <span className="fn-audio-row__name">{name}</span> : null}
      <a className="fn-button fn-button--secondary fn-button--sm" href={url} download>
        Unduh
      </a>
      <a className="fn-button fn-button--ghost fn-button--sm" href={url} target="_blank" rel="noopener noreferrer">
        Putar terpisah
      </a>
      {onDelete ? (
        <button
          type="button"
          className="fn-button fn-button--ghost fn-button--sm"
          style={{ color: 'var(--fn-color-danger-text)' }}
          onClick={onDelete}
        >
          Hapus
        </button>
      ) : null}
    </div>
  );
}

export function StatusDot({ state }: { state?: { ready: boolean; loading: boolean; error: string | null } }) {
  if (!state) return <StatusChip tone="neutral">memeriksa…</StatusChip>;
  if (state.ready) return <StatusChip tone="positive">siap</StatusChip>;
  if (state.loading) return <StatusChip tone="info">memuat…</StatusChip>;
  if (state.error) return <StatusChip tone="negative">gagal</StatusChip>;
  return <StatusChip tone="neutral">nonaktif</StatusChip>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="fn-meta" style={{ textAlign: 'center', padding: 'var(--fn-space-4) 0', margin: 0 }}>
      {children}
    </p>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="fn-kicker">{label}</span>
      <span style={{ fontFamily: 'var(--fn-font-mono)', fontSize: 'var(--fn-text-sm)' }}>{value}</span>
    </div>
  );
}
