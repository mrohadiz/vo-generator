import { Button } from '@fieldnote-ui/ui';
import type { Analysis, AnnotateInfo } from '../types';
import { Card, Empty, Field, Notice, Stat } from './ui';
import { fmtDur } from '../lib';

export function SinglePanel({
  rawText,
  onRawChange,
  cleanedText,
  onCleanedChange,
  analysis,
  onClean,
  cleaning,
  onAnnotate,
  annotating,
  annotateInfo,
  error,
}: {
  rawText: string;
  onRawChange: (v: string) => void;
  cleanedText: string;
  onCleanedChange: (v: string) => void;
  analysis: Analysis | null;
  onClean: () => void;
  cleaning: boolean;
  onAnnotate: () => void;
  annotating: boolean;
  annotateInfo: AnnotateInfo | null;
  error: string | null;
}) {
  const chars = rawText.length;

  return (
    <div className="fn-stack">
      <Card
        title="1. Naskah mentah"
        actions={
          <span className="fn-meta">
            {chars.toLocaleString('id-ID')} karakter · ±{fmtDur(analysis?.estimated_seconds ?? 0)}
          </span>
        }
      >
        <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
          <textarea
            className="fn-textarea fn-textarea--tall"
            value={rawText}
            onChange={(e) => onRawChange(e.target.value)}
            placeholder={
              'Tempelkan naskah narasi mentah di sini…\n\nContoh:\nDi dunia yang diliputi bintang khayal, kabut imajinasi, nama-nama dan impian, tak semua kenyataan lahir dari bayangan.'
            }
            aria-label="Naskah mentah"
          />
          <div className="fn-row">
            <Button onClick={onClean} disabled={cleaning || !rawText.trim()}>
              {cleaning ? 'Membersihkan…' : 'Cek & bersihkan teks'}
            </Button>
          </div>
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </div>
      </Card>

      {analysis ? (
        <>
          <Card title="2. Teks bersih">
            <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Kata" value={analysis.word_count.toLocaleString('id-ID')} />
                <Stat label="Karakter" value={analysis.char_count.toLocaleString('id-ID')} />
                <Stat label="Perkiraan" value={analysis.estimated_duration} />
                <Stat label="Segmen" value={analysis.segment_count} />
              </div>

              {analysis.title ? <p className="fn-meta">Judul terdeteksi: {analysis.title}</p> : null}

              {analysis.warnings.length > 0 ? (
                <div className="fn-stack" style={{ gap: 'var(--fn-space-2)' }}>
                  {analysis.warnings.map((w) => (
                    <Notice key={w} tone="warning">
                      {w}
                    </Notice>
                  ))}
                </div>
              ) : null}

              <Field
                label="Teks siap dibacakan"
                htmlFor="cleaned-text"
                hint="Boleh diubah manual: perbaiki pelafalan, angka, atau tanda baca."
              >
                <textarea
                  id="cleaned-text"
                  className="fn-textarea"
                  value={cleanedText}
                  onChange={(e) => onCleanedChange(e.target.value)}
                />
              </Field>

              <div className="fn-row">
                <Button variant="secondary" onClick={onAnnotate} disabled={annotating || !cleanedText.trim()}>
                  {annotating ? 'Memetakan…' : 'Petakan ekspresi & jeda'}
                </Button>
                <span className="fn-meta">AI memberi [emosi X] dan [jeda N] dari isi kalimat.</span>
              </div>

              {annotateInfo ? (
                <Notice tone={annotateInfo.mode === 'ai' ? 'info' : 'warning'}>
                  {annotateInfo.note || 'Dipetakan dengan aturan generik (tanpa AI).'}
                </Notice>
              ) : null}

              {analysis.segments.length > 0 ? (
                <details>
                  <summary className="fn-meta" style={{ cursor: 'pointer' }}>
                    Lihat {analysis.segments.length} segmen kalimat
                  </summary>
                  <div className="mt-2">
                    {analysis.segments.map((s, i) => (
                      <div className="fn-segment" key={`${i}-${s.slice(0, 12)}`}>
                        <span className="fn-meta" style={{ minWidth: '1.5rem' }}>
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <Empty>Belum ada segmen.</Empty>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
