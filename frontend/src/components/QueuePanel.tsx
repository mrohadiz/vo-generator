import { Button, StatusChip } from '@fieldnote-ui/ui';
import type { QueueJob } from '../types';
import { fmtDate } from '../lib';
import { Card, Empty } from './ui';

const TONE: Record<QueueJob['status'], 'neutral' | 'info' | 'positive' | 'negative' | 'caution'> = {
  queued: 'neutral',
  running: 'info',
  done: 'positive',
  error: 'negative',
  cancelled: 'caution',
};

const LABEL: Record<QueueJob['status'], string> = {
  queued: 'Menunggu',
  running: 'Diproses',
  done: 'Selesai',
  error: 'Gagal',
  cancelled: 'Dibatalkan',
};

export function QueuePanel({
  items,
  queued,
  error,
  onRefresh,
  onCancel,
  onRemove,
  onClearDone,
}: {
  items: QueueJob[];
  queued: number;
  error: string | null;
  onRefresh: () => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
}) {
  return (
    <Card
      id="queue-panel"
      title="Antrian generate"
      actions={
        <>
          <span className="fn-meta">{queued} menunggu</span>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            Segarkan
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearDone}>
            Bersihkan selesai
          </Button>
        </>
      }
    >
      {error ? <p className="fn-note fn-note--danger mb-2">{error}</p> : null}
      {items.length === 0 ? (
        <Empty>Belum ada antrian. Klik “Tambah ke antrian” untuk menyiapkan beberapa naskah sekaligus.</Empty>
      ) : (
        <div className="fn-scroll-x">
          <table className="fn-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Judul / tipe</th>
                <th>Mesin</th>
                <th>Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id}>
                  <td>
                    <StatusChip tone={TONE[job.status]}>{LABEL[job.status]}</StatusChip>
                    {job.status === 'error' && job.error ? (
                      <div className="fn-meta mt-1" style={{ maxWidth: '14rem', color: 'var(--fn-color-danger-text)' }}>
                        {job.error}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div style={{ fontWeight: 'var(--fn-weight-medium)' }}>{job.title || '(tanpa judul)'}</div>
                    <div className="fn-meta">{job.type === 'theater' ? 'Mode teater' : 'Generate narasi'}</div>
                  </td>
                  <td className="fn-meta">{job.engine || '-'}</td>
                  <td className="fn-meta">
                    <div>Buat: {fmtDate(job.created_at)}</div>
                    {job.started_at ? <div>Mulai: {fmtDate(job.started_at)}</div> : null}
                    {job.finished_at ? <div>Selesai: {fmtDate(job.finished_at)}</div> : null}
                  </td>
                  <td>
                    <JobActions job={job} onCancel={onCancel} onRemove={onRemove} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function JobActions({
  job,
  onCancel,
  onRemove,
}: {
  job: QueueJob;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const removeButton = (
    <button
      type="button"
      className="fn-button fn-button--ghost fn-button--sm"
      style={{ color: 'var(--fn-color-danger-text)' }}
      onClick={() => onRemove(job.id)}
      title="Hapus catatan job ini (berkas audio tetap ada)"
    >
      Hapus
    </button>
  );

  if (job.status === 'queued') {
    return (
      <div className="fn-row" style={{ gap: 'var(--fn-space-2)' }}>
        <Button variant="ghost" size="sm" onClick={() => onCancel(job.id)}>
          Batalkan
        </Button>
      </div>
    );
  }
  if (job.status === 'running') return <span className="fn-meta">Sedang berjalan…</span>;
  if (job.status === 'done' && job.result) {
    const url = job.result.audio_url;
    return (
      <div className="fn-row" style={{ gap: 'var(--fn-space-2)' }}>
        <audio controls preload="none" src={url} style={{ height: '2rem', maxWidth: '13rem' }} />
        <a className="fn-button fn-button--secondary fn-button--sm" href={url} download>
          Unduh
        </a>
        <a className="fn-button fn-button--ghost fn-button--sm" href={url} target="_blank" rel="noopener noreferrer">
          Putar
        </a>
        {removeButton}
      </div>
    );
  }
  return <div className="fn-row">{removeButton}</div>;
}
