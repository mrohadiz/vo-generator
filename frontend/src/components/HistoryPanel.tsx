import { Button } from '@fieldnote-ui/ui';
import { api } from '../api';
import type { HistoryResponse } from '../types';
import { fmtBytes } from '../lib';
import { AudioRow, Card, Empty } from './ui';

export function HistoryPanel({
  data,
  loading,
  error,
  onRefresh,
}: {
  data: HistoryResponse;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const { files, folders } = data;

  return (
    <Card
      id="history-panel"
      title="Riwayat produksi"
      actions={
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          Segarkan
        </Button>
      }
    >
      <div className="fn-stack" style={{ gap: 'var(--fn-space-4)' }}>
        {error ? <p className="fn-note fn-note--danger">{error}</p> : null}

        {folders.length > 0 ? (
          <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
            {folders.map((folder) => (
              <details
                key={folder.folder}
                open={folder.count <= 6}
                className="rounded-[var(--fn-radius-sm)] border border-fn-border p-3"
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span>
                    <span style={{ fontWeight: 'var(--fn-weight-semibold)' }}>{folder.folder}</span>
                    <span className="fn-meta" style={{ marginLeft: 'var(--fn-space-2)' }}>
                      {folder.count} berkas · {folder.time}
                    </span>
                  </span>
                  <a
                    className="fn-button fn-button--secondary fn-button--sm"
                    href={api.zipUrl(folder.folder)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Unduh ZIP
                  </a>
                </summary>
                <div className="fn-stack mt-3" style={{ gap: 'var(--fn-space-2)' }}>
                  {folder.files.map((file) => (
                    <AudioRow key={file.url} url={file.url} name={file.name} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : null}

        {files.length > 0 ? (
          <div className="fn-scroll-x">
            <table className="fn-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Mesin</th>
                  <th>Berkas</th>
                  <th>Suara</th>
                  <th>Ukuran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.filename}>
                    <td className="fn-meta">{file.time}</td>
                    <td className="fn-meta">{file.engine}</td>
                    <td style={{ maxWidth: '18rem', overflowWrap: 'anywhere' }}>{file.filename}</td>
                    <td className="fn-meta">{file.voice}</td>
                    <td className="fn-meta">{fmtBytes(file.size)}</td>
                    <td>
                      <div className="fn-row" style={{ gap: 'var(--fn-space-2)' }}>
                        <audio controls preload="none" src={file.url} style={{ height: '2rem', maxWidth: '12rem' }} />
                        <a className="fn-button fn-button--secondary fn-button--sm" href={file.url} download>
                          Unduh
                        </a>
                        <a
                          className="fn-button fn-button--ghost fn-button--sm"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Putar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && folders.length === 0 && files.length === 0 ? (
          <Empty>Belum ada hasil. Generate narasi pertama Anda.</Empty>
        ) : null}
        {loading ? <Empty>Memuat riwayat…</Empty> : null}
      </div>
    </Card>
  );
}
