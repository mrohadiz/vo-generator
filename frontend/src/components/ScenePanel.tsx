import { Button } from '@fieldnote-ui/ui';
import type { AnnotateInfo, SceneDraft } from '../types';
import { Card, Empty, Field, Notice, Stat } from './ui';

export function ScenePanel({
  sceneRaw,
  onSceneRawChange,
  groupWords,
  onGroupWordsChange,
  scenes,
  onCleanScenes,
  cleaning,
  onSceneChange,
  onAnnotateScenes,
  annotating,
  annotateInfo,
  onGenerate,
  busy,
  error,
}: {
  sceneRaw: string;
  onSceneRawChange: (v: string) => void;
  groupWords: number;
  onGroupWordsChange: (v: number) => void;
  scenes: SceneDraft[];
  onCleanScenes: () => void;
  cleaning: boolean;
  onSceneChange: (index: number, text: string) => void;
  onAnnotateScenes: () => void;
  annotating: boolean;
  annotateInfo: AnnotateInfo | null;
  onGenerate: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="fn-stack">
      <Card title="1. Naskah dengan scene">
        <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
          <textarea
            className="fn-textarea fn-textarea--tall"
            value={sceneRaw}
            onChange={(e) => onSceneRawChange(e.target.value)}
            placeholder={
              'Tempel 3–5 scene sekaligus. Pisahkan dengan baris kosong, atau baris “Scene 1”, “---”, atau “***”.\n\nScene 1\nBagi jutaan pasang mata…\n\nScene 2\nJauh sebelum ia dipanggil…'
            }
            aria-label="Naskah dengan scene"
          />

          <Field
            label={`Gabung paragraf jadi scene ±${groupWords} kata`}
            htmlFor="group-words"
            hint="0 = satu paragraf satu scene. Tidak berlaku bila ada pemisah Scene/***."
          >
            <input
              id="group-words"
              className="fn-range"
              type="range"
              min={0}
              max={400}
              step={20}
              value={groupWords}
              onChange={(e) => onGroupWordsChange(Number(e.target.value))}
            />
          </Field>

          <div className="fn-row">
            <Button onClick={onCleanScenes} disabled={cleaning || !sceneRaw.trim()}>
              {cleaning ? 'Merapikan…' : 'Rapikan / bersihkan scene'}
            </Button>
          </div>
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </div>
      </Card>

      {scenes.length > 0 ? (
        <Card
          title="2. Periksa tiap scene"
          actions={
            <>
              <span className="fn-meta">{scenes.length} scene</span>
              <Button variant="secondary" size="sm" onClick={onAnnotateScenes} disabled={annotating}>
                {annotating ? 'Memetakan…' : 'Petakan ekspresi & jeda'}
              </Button>
            </>
          }
        >
          <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
            {annotateInfo ? (
              <Notice tone={annotateInfo.mode === 'ai' ? 'info' : 'warning'}>
                {annotateInfo.note || 'Dipetakan dengan aturan generik (tanpa AI).'}
              </Notice>
            ) : null}

            {scenes.map((scene, i) => (
              <div key={scene.index} className="rounded-[var(--fn-radius-sm)] border border-fn-border bg-fn-surface p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="fn-kicker">Scene {String(scene.index).padStart(2, '0')}</span>
                  <span className="fn-meta">
                    {scene.word_count} kata · {scene.estimated_duration}
                  </span>
                </div>
                <textarea
                  className="fn-textarea"
                  value={scene.cleaned_text}
                  onChange={(e) => onSceneChange(i, e.target.value)}
                  aria-label={`Teks scene ${scene.index}`}
                />
                {scene.warnings.length > 0 ? (
                  <div className="mt-2">
                    <Notice tone="warning">{scene.warnings.join(' ')}</Notice>
                  </div>
                ) : null}
              </div>
            ))}

            <div className="fn-row">
              <Button onClick={onGenerate} disabled={busy}>
                {busy ? 'Memproses…' : `Generate ${scenes.length} scene`}
              </Button>
              <span className="fn-meta">Setiap scene menjadi satu berkas scene_NN.wav.</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="2. Periksa tiap scene">
          <Empty>Belum ada scene. Rapikan naskah di atas untuk melihat daftar scene.</Empty>
          <div className="sr-only">
            <Stat label="-" value="-" />
          </div>
        </Card>
      )}
    </div>
  );
}
