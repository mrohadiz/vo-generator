import { Button } from '@fieldnote-ui/ui';
import type { AnnotateInfo, Character, Engine, TheaterScene } from '../types';
import { Card, Empty, Field, Notice } from './ui';
import { EMOTIONS } from '../lib';

export function TheaterPanel({
  raw,
  onRawChange,
  useAi,
  onUseAiChange,
  onAnalyze,
  analyzing,
  info,
  characters,
  scenes,
  engines,
  onCharacterChange,
  onLineChange,
  onTryVoice,
  tryingName,
  onGenerate,
  busy,
  error,
}: {
  raw: string;
  onRawChange: (v: string) => void;
  useAi: boolean;
  onUseAiChange: (v: boolean) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  info: AnnotateInfo | null;
  characters: Character[];
  scenes: TheaterScene[];
  engines: Engine[];
  onCharacterChange: (name: string, patch: Partial<Character>) => void;
  onLineChange: (sceneIndex: number, lineIndex: number, patch: Partial<TheaterScene['lines'][number]>) => void;
  onTryVoice: (name: string) => void;
  tryingName: string | null;
  onGenerate: () => void;
  busy: boolean;
  error: string | null;
}) {
  const supertonicVoices = engines.find((e) => e.id === 'supertonic')?.voices ?? [];
  const geminiVoices = engines.find((e) => e.id === 'gemini_tts')?.voices ?? [];
  const lineCount = scenes.reduce((n, s) => n + s.lines.length, 0);

  return (
    <div className="fn-stack">
      <Card title="1. Cerita">
        <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
          <textarea
            className="fn-textarea fn-textarea--tall"
            value={raw}
            onChange={(e) => onRawChange(e.target.value)}
            placeholder="Tempel cerita lengkap. AI memetakan scene, tokoh, dan siapa mengucapkan apa; setelah itu Anda mengatur suara tiap tokoh."
            aria-label="Cerita untuk mode teater"
          />
          <div className="fn-row">
            <label className="fn-row" style={{ gap: 'var(--fn-space-2)', fontSize: 'var(--fn-text-sm)' }}>
              <input type="checkbox" checked={useAi} onChange={(e) => onUseAiChange(e.target.checked)} />
              Pakai AI (cadangan otomatis ke aturan generik)
            </label>
            <Button onClick={onAnalyze} disabled={analyzing || !raw.trim()}>
              {analyzing ? 'Menganalisis…' : 'Analisis cerita'}
            </Button>
          </div>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {info ? (
            <Notice tone={info.mode === 'ai' ? 'info' : 'warning'}>
              {info.note || 'Dipetakan dengan aturan generik (tanpa AI).'}
            </Notice>
          ) : null}
        </div>
      </Card>

      {characters.length > 0 ? (
        <Card title="2. Tokoh & suara" actions={<span className="fn-meta">{characters.length} tokoh</span>}>
          <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
            {characters.map((c) => {
              const voices =
                c.provider === 'supertonic'
                  ? supertonicVoices
                  : c.provider === 'gemini_tts' || c.provider === 'gemini_gw'
                    ? geminiVoices
                    : [];
              return (
                <div
                  key={c.name}
                  className="rounded-[var(--fn-radius-sm)] border border-fn-border bg-fn-surface p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong style={{ fontFamily: 'var(--fn-font-display)' }}>{c.name}</strong>
                      <span className="fn-meta" style={{ marginLeft: 'var(--fn-space-2)' }}>
                        {c.gender} · {c.age}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onTryVoice(c.name)} disabled={tryingName === c.name}>
                      {tryingName === c.name ? 'Mencoba…' : 'Coba suara'}
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Penyedia">
                      <select
                        className="fn-select"
                        value={c.provider}
                        onChange={(e) => onCharacterChange(c.name, { provider: e.target.value as Character['provider'] })}
                      >
                        <option value="supertonic">Supertonic</option>
                        <option value="gemini_tts">Gemini TTS</option>
                        <option value="gemini_gw">Gemini (OmniRoute)</option>
                        <option value="drama3">Drama 3</option>
                      </select>
                    </Field>

                    {(c.provider === 'supertonic' || c.provider.startsWith('gemini')) && (
                      <Field label="Suara">
                        <select
                          className="fn-select"
                          value={c.provider === 'supertonic' ? c.voice : (c.gemini_voice ?? '')}
                          onChange={(e) =>
                            onCharacterChange(
                              c.name,
                              c.provider === 'supertonic'
                                ? { voice: e.target.value }
                                : { gemini_voice: e.target.value },
                            )
                          }
                        >
                          {voices.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    {c.provider === 'supertonic' ? (
                      <>
                        <Field label={`Nada: ${c.pitch >= 0 ? '+' : ''}${c.pitch.toFixed(1)} semitone`}>
                          <input
                            className="fn-range"
                            type="range"
                            min={-6}
                            max={8}
                            step={0.5}
                            value={c.pitch}
                            onChange={(e) => onCharacterChange(c.name, { pitch: Number(e.target.value) })}
                          />
                        </Field>
                        <Field label={`Kecepatan: ${c.speed.toFixed(2)}×`}>
                          <input
                            className="fn-range"
                            type="range"
                            min={0.8}
                            max={1.3}
                            step={0.05}
                            value={c.speed}
                            onChange={(e) => onCharacterChange(c.name, { speed: Number(e.target.value) })}
                          />
                        </Field>
                      </>
                    ) : null}
                  </div>

                  {c.voice_description ? <p className="fn-meta mt-2">{c.voice_description}</p> : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {scenes.length > 0 ? (
        <Card
          title="3. Scene & dialog"
          actions={
            <span className="fn-meta">
              {scenes.length} scene · {lineCount} baris
            </span>
          }
        >
          <div className="fn-stack" style={{ gap: 'var(--fn-space-4)' }}>
            {scenes.map((scene, si) => (
              <div key={`${si}-${scene.title}`}>
                <p className="fn-kicker mb-2">
                  Scene {String(si + 1).padStart(2, '0')}
                  {scene.title ? ` — ${scene.title}` : ''}
                </p>
                <div className="fn-stack" style={{ gap: 'var(--fn-space-2)' }}>
                  {scene.lines.map((line, li) => (
                    <div
                      key={`${si}-${li}`}
                      className="grid gap-2 rounded-[var(--fn-radius-sm)] border border-fn-border bg-fn-surface p-2 sm:grid-cols-[10rem_1fr_9rem_5rem]"
                    >
                      <span
                        className="fn-meta"
                        style={{ color: 'var(--fn-color-text-secondary)', alignSelf: 'start', paddingTop: '0.5rem' }}
                      >
                        {line.speaker}
                      </span>
                      <textarea
                        className="fn-textarea"
                        style={{ minHeight: '2.5rem' }}
                        value={line.text}
                        onChange={(e) => onLineChange(si, li, { text: e.target.value })}
                        aria-label={`Baris ${li + 1} scene ${si + 1}`}
                      />
                      <select
                        className="fn-select"
                        value={line.emotion}
                        onChange={(e) => onLineChange(si, li, { emotion: e.target.value })}
                        aria-label="Emosi"
                      >
                        {EMOTIONS.map((em) => (
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                      </select>
                      <input
                        className="fn-input"
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={line.pause}
                        onChange={(e) => onLineChange(si, li, { pause: Number(e.target.value) })}
                        aria-label="Jeda setelah baris (detik)"
                        title="Jeda setelah baris (detik)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="fn-row">
              <Button onClick={onGenerate} disabled={busy}>
                {busy ? 'Memproses…' : 'Generate teater'}
              </Button>
              <span className="fn-meta">Baris berurutan dari tokoh yang sama digabung agar intonasi mengalir.</span>
            </div>
          </div>
        </Card>
      ) : characters.length === 0 ? (
        <Card title="2. Tokoh & suara">
          <Empty>Analisis cerita dulu untuk memetakan tokoh dan dialog.</Empty>
        </Card>
      ) : null}
    </div>
  );
}
