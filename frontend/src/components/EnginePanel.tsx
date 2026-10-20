import { useRef, useState } from 'react';
import { Button } from '@fieldnote-ui/ui';
import { api } from '../api';
import type { Engine, EngineId } from '../types';
import { Card, Field, Notice } from './ui';

export function EnginePanel({
  engines,
  engineId,
  onEngineChange,
  voiceId,
  onVoiceChange,
  speed,
  onSpeedChange,
  style,
  onStyleChange,
  onGenerate,
  onGenerateDirect,
  busy,
  etaText,
  notice,
  disabled,
}: {
  engines: Engine[];
  engineId: EngineId;
  onEngineChange: (id: EngineId) => void;
  voiceId: string;
  onVoiceChange: (id: string) => void;
  speed: number;
  onSpeedChange: (v: number) => void;
  style: string;
  onStyleChange: (v: string) => void;
  onGenerate: () => void;
  onGenerateDirect: () => void;
  busy: boolean;
  etaText: string;
  notice: { tone: 'warning' | 'info' | 'danger'; text: string } | null;
  disabled?: boolean;
}) {
  const engine = engines.find((e) => e.id === engineId);
  const voices = engine?.voices ?? [];

  /** Sampel suara: Pocket-TTS memakai referensi, mesin lain disintesis sekali lalu di-cache. */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sampling, setSampling] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function playSample(refresh = false) {
    if (!voiceId || sampling) return;
    setSampling(true);
    setSampleError(null);
    try {
      const data = await api.voiceSample(engineId, voiceId, refresh);
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = `${data.audio_url}${data.cached ? '' : `?t=${Date.now()}`}`;
      await audio.play();
    } catch (e) {
      setSampleError((e as Error).message);
    } finally {
      setSampling(false);
    }
  }

  return (
    <Card title="Mesin suara">
      <div className="fn-stack" style={{ gap: 'var(--fn-space-3)' }}>
        <Field label="Mesin" htmlFor="engine-select" hint={engine?.description}>
          <select
            id="engine-select"
            className="fn-select"
            value={engineId}
            onChange={(e) => onEngineChange(e.target.value as EngineId)}
          >
            {engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>

        {engine?.supports_style ? (
          <Field
            label="Gaya bacaan"
            htmlFor="style-input"
            hint="Bahasa Inggris, mis. “Rich, unhurried storytelling narration in Indonesian”."
          >
            <input
              id="style-input"
              className="fn-input"
              value={style}
              onChange={(e) => onStyleChange(e.target.value)}
              placeholder={engine.default_style ?? ''}
            />
          </Field>
        ) : null}

        {engine?.supports_speed ? (
          <Field label={`Kecepatan bicara: ${speed.toFixed(2)}×`} htmlFor="speed-range">
            <input
              id="speed-range"
              className="fn-range"
              type="range"
              min={0.8}
              max={1.3}
              step={0.05}
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
            />
          </Field>
        ) : null}

        <Field label="Suara" htmlFor="voice-select" hint="Dengarkan contoh sebelum menambahkan ke antrian.">
          <select
            id="voice-select"
            className="fn-select"
            value={voiceId}
            onChange={(e) => onVoiceChange(e.target.value)}
          >
            {voices.length === 0 ? <option value="">(tidak ada suara)</option> : null}
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>

        {voices.length > 0 ? (
          <div className="fn-row" style={{ gap: 'var(--fn-space-2)' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void playSample(false)}
              disabled={!voiceId || sampling || busy}
            >
              {sampling
                ? 'Menyiapkan sampel…'
                : `Coba suara ${(voices.find((v) => v.id === voiceId)?.name ?? '').split(' - ')[0]}`.trim()}
            </Button>
            <button
              type="button"
              className="fn-button fn-button--ghost fn-button--sm"
              onClick={() => void playSample(true)}
              disabled={!voiceId || sampling || busy}
              title="Buat ulang sampel (abaikan cache)"
            >
              Buat ulang
            </button>
          </div>
        ) : null}

        {sampleError ? <Notice tone="danger">{sampleError}</Notice> : null}
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

        <div className="fn-stack" style={{ gap: 'var(--fn-space-2)', marginTop: 'var(--fn-space-2)' }}>
          <Button onClick={onGenerate} disabled={busy || disabled} style={{ width: '100%' }}>
            {busy ? 'Memproses…' : 'Tambah ke antrian'}
          </Button>
          <Button variant="secondary" onClick={onGenerateDirect} disabled={busy || disabled} style={{ width: '100%' }}>
            Generate langsung (tanpa antrian)
          </Button>
          {etaText ? <p className="fn-meta" style={{ textAlign: 'center', margin: 0 }}>{etaText}</p> : null}
        </div>
      </div>
    </Card>
  );
}
