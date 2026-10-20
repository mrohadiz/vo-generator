/** Utilitas kecil yang dipakai UI. */

import type { EngineId, Engine, Voice } from './types';

/** "Kota Rawa: Dunia Antara" → "kota-rawa-dunia-antara" (sama seperti _slug di app.py). */
export function slugify(title: string, maxlen = 60): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .slice(0, maxlen)
    .replace(/^-+|-+$/g, '');
}

export function fmtDur(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Perkiraan durasi audio dari jumlah kata (140 WPM). */
export function estimateAudioSeconds(text: string): number {
  const clean = (text || '')
    .replace(/[([][^)\]]*(emosi|jeda)[^)\]]*[)\]]/gi, ' ')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ');
  const words = clean.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
  return (words / 140) * 60;
}

/* ── Rasio waktu-proses per mesin, dipelajari dari hasil sebelumnya ───── */

const RTF_KEY = 'vo-generator-rtf';

const RTF_DEFAULT: Record<string, number> = {
  supertonic: 0.55,
  pocket_tts: 3.4,
  gemini_tts: 0.45,
  gemini_gw: 0.3,
  drama3: 15,
};

function readRtf(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RTF_KEY);
    return raw ? { ...RTF_DEFAULT, ...(JSON.parse(raw) as Record<string, number>) } : { ...RTF_DEFAULT };
  } catch {
    return { ...RTF_DEFAULT };
  }
}

export function getRtf(engine: string): number {
  return readRtf()[engine] ?? 1;
}

export function learnRtf(engine: string, processSec: number, audioSec: number): void {
  if (!processSec || !audioSec || audioSec < 3) return;
  const sample = processSec / audioSec;
  if (!Number.isFinite(sample) || sample <= 0 || sample > 60) return;
  const all = readRtf();
  all[engine] = all[engine] ? all[engine] * 0.7 + sample * 0.3 : sample;
  try {
    localStorage.setItem(RTF_KEY, JSON.stringify(all));
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

export function fmtDate(ts: number): string {
  if (!ts) return '-';
  try {
    return new Date(ts * 1000).toLocaleString('id-ID');
  } catch {
    return '-';
  }
}

export function findVoice(engine: Engine | undefined, voiceId: string): Voice | undefined {
  return engine?.voices.find((v) => v.id === voiceId);
}

export const ENGINE_LABEL: Record<string, string> = {
  supertonic: 'Supertonic',
  pocket_tts: 'Pocket-TTS',
  gemini_tts: 'Gemini TTS',
  gemini_gw: 'Gemini (OmniRoute)',
  drama3: 'Drama 3',
};

export function engineLabel(id: EngineId | string): string {
  return ENGINE_LABEL[id] ?? id;
}

export const EMOTIONS = [
  'netral',
  'senang',
  'sedih',
  'marah',
  'takut',
  'kaget',
  'berbisik',
  'tegas',
  'lembut',
  'licik',
  'menggoda',
] as const;
