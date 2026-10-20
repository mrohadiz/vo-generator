import { useState } from 'react';
import { Button } from '@fieldnote-ui/ui';
import { Card, Field, Notice } from './ui';
import { slugify } from '../lib';

export function ProjectBar({
  title,
  onTitleChange,
  onFetchUrl,
  fetching,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  onFetchUrl: (url: string) => Promise<void>;
  fetching: boolean;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const folder = slugify(title);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setError(null);
    try {
      await onFetchUrl(url.trim());
      setUrl('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card title="Proyek">
      <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
        <Field
          label="Judul narasi"
          htmlFor="project-title"
          hint={folder ? `Folder hasil: output/${folder}/` : 'Judul menjadi nama folder hasil.'}
        >
          <input
            id="project-title"
            className="fn-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="mis. Kota Rawa — Dunia Antara"
            autoComplete="off"
          />
        </Field>

        <form onSubmit={submit} className="fn-stack" style={{ gap: 'var(--fn-space-2)' }}>
          <Field label="Ambil naskah dari URL" htmlFor="source-url" hint="Isi artikel diambil lewat Jina Reader; navigasi dan iklan dibuang.">
            <div className="fn-row" style={{ flexWrap: 'nowrap' }}>
              <input
                id="source-url"
                className="fn-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://situs.com/artikel-atau-cerita"
                inputMode="url"
                autoComplete="off"
              />
              <Button type="submit" variant="secondary" disabled={fetching || !url.trim()}>
                {fetching ? 'Mengambil…' : 'Ambil'}
              </Button>
            </div>
          </Field>
        </form>

        {error ? <Notice tone="danger">{error}</Notice> : null}
      </div>
    </Card>
  );
}
