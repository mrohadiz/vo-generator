import { Button, StatusChip } from '@fieldnote-ui/ui';
import type { VoiceOptionEntry, VoiceRecommendation } from '../types';
import { Card, Notice } from './ui';

const MODE_LABEL: Record<VoiceRecommendation['mode_hint'], string> = {
  single: 'satu audio utuh',
  scene: 'dipecah per scene',
  theater: 'banyak tokoh (mode teater)',
};

export function RecommendPanel({
  rec,
  loading,
  error,
  disabled,
  onRecommend,
  onApply,
}: {
  rec: VoiceRecommendation | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onRecommend: () => void;
  onApply: (entry: { engine: string; voice: string; speed: number; style: string }) => void;
}) {
  function applyMain() {
    if (!rec) return;
    onApply({ engine: rec.engine, voice: rec.voice, speed: rec.speed, style: rec.style });
  }

  function applyAlternative(alt: VoiceOptionEntry) {
    if (!rec) return;
    onApply({
      engine: alt.engine,
      voice: alt.voice,
      speed: rec.speed,
      style: alt.engine === 'gemini_tts' ? rec.style : '',
    });
  }

  return (
    <Card
      id="recommend-panel"
      title="Rekomendasi suara"
      actions={
        <Button variant={rec ? 'ghost' : 'secondary'} size="sm" onClick={onRecommend} disabled={loading || disabled}>
          {loading ? 'Menganalisis…' : rec ? 'Analisis ulang' : 'Minta rekomendasi'}
        </Button>
      }
    >
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {!rec && !loading ? (
        <p className="text-sm text-fn-text-secondary" style={{ margin: 0 }}>
          AI membaca naskah yang sudah dibersihkan, lalu menyarankan mesin, suara, kecepatan, dan gaya bacaan yang
          paling cocok — lengkap dengan alasannya. {disabled ? 'Bersihkan naskah dulu untuk memakai fitur ini.' : ''}
        </p>
      ) : null}

      {rec ? (
        <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusChip tone={rec.source === 'ai' ? 'info' : 'caution'}>
              {rec.source === 'ai' ? 'Analisis AI' : 'Aturan kata kunci'}
            </StatusChip>
            <span className="fn-meta">
              {rec.genre} · {rec.tone}
            </span>
            <span className="fn-meta">Saran penyajian: {MODE_LABEL[rec.mode_hint]}</span>
          </div>

          <div className="rounded-[var(--fn-radius-sm)] border border-fn-border bg-fn-surface-sunken p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="fn-kicker" style={{ marginBottom: 2 }}>
                  Suara utama
                </p>
                <p
                  style={{
                    fontFamily: 'var(--fn-font-display)',
                    fontSize: 'var(--fn-text-xl)',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {rec.voice_name}
                </p>
                <p className="fn-meta" style={{ marginTop: 2 }}>
                  {rec.engine_name} · kecepatan {rec.speed.toFixed(2)}×
                  {rec.style ? ` · gaya: “${rec.style}”` : ''}
                </p>
              </div>
              <Button size="sm" onClick={applyMain}>
                Pakai suara ini
              </Button>
            </div>

            <p className="mt-3 text-sm text-fn-text-secondary" style={{ marginBottom: 0 }}>
              {rec.reason}
            </p>

            {rec.emotions.length > 0 ? (
              <div className="fn-row mt-2" style={{ gap: 'var(--fn-space-1-5)' }}>
                <span className="fn-kicker">Emosi dominan</span>
                {rec.emotions.map((e) => (
                  <span key={e} className="fn-tag">
                    {e}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {rec.alternatives.length > 0 ? (
            <div>
              <p className="fn-kicker" style={{ marginBottom: 'var(--fn-space-2)' }}>
                Alternatif
              </p>
              <div className="fn-stack" style={{ gap: 'var(--fn-space-2)' }}>
                {rec.alternatives.map((alt) => (
                  <div
                    key={`${alt.engine}-${alt.voice}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--fn-radius-sm)] border border-fn-border p-2"
                  >
                    <div style={{ minWidth: '12rem' }}>
                      <div style={{ fontWeight: 'var(--fn-weight-medium)' }}>{alt.voice_name}</div>
                      <div className="fn-meta">
                        {alt.engine_name}
                        {alt.reason ? ` — ${alt.reason}` : ''}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => applyAlternative(alt)}>
                      Pakai
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {rec.note ? <p className="fn-meta" style={{ margin: 0 }}>{rec.note}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
