import { api } from '../api';
import type { SynthesizeResult } from '../types';
import { fmtBytes } from '../lib';
import { AudioRow, Card, Notice } from './ui';

export function ResultPanel({
  result,
  sceneResults,
  folder,
  warnings,
}: {
  result: SynthesizeResult | null;
  sceneResults: SynthesizeResult[];
  folder: string;
  warnings: string[];
}) {
  if (!result && sceneResults.length === 0) return null;

  return (
    <Card
      title="Hasil"
      actions={
        folder ? (
          <a className="fn-button fn-button--secondary fn-button--sm" href={api.zipUrl(folder)}>
            Unduh ZIP
          </a>
        ) : null
      }
    >
      <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
        {warnings.length > 0
          ? warnings.map((w) => (
              <Notice key={w} tone="warning">
                {w}
              </Notice>
            ))
          : null}

        {result ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="fn-kicker">Audio narasi</span>
              <span className="fn-meta">
                {result.engine.toUpperCase()} · {result.duration} · {fmtBytes(result.size_bytes)} · proses{' '}
                {result.process_time_sec}s
              </span>
            </div>
            <AudioRow url={`${result.audio_url}?t=${result.process_time_sec}`} name={result.filename} />
          </div>
        ) : null}

        {sceneResults.length > 0 ? (
          <div>
            <p className="fn-kicker mb-2">{sceneResults.length} scene selesai</p>
            <div className="fn-stack" style={{ gap: 'var(--fn-space-2)' }}>
              {sceneResults.map((scene) => (
                <AudioRow
                  key={scene.filename}
                  url={`${scene.audio_url}?t=${scene.process_time_sec}`}
                  name={`${scene.filename} · ${scene.duration}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
