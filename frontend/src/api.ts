/** Pembungkus tipis di atas API Flask. Semua route relatif terhadap origin yang sama. */

import type {
  Analysis,
  AnnotateResult,
  DirectResult,
  Engine,
  HistoryResponse,
  QueueJob,
  QueueList,
  SceneDraft,
  StatusResponse,
  SynthesizeResult,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const raw = (data as { message?: unknown } | null)?.message;
    const message = typeof raw === 'string' && raw ? raw : `Permintaan gagal (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { headers: { Accept: 'application/json' } }));
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export const api = {
  status: () => get<StatusResponse>('/api/status'),

  options: async (): Promise<Engine[]> => {
    const data = await get<{ engines: Engine[] }>('/api/options');
    return data.engines ?? [];
  },

  clean: (text: string) => post<Analysis>('/api/clean', { text }),

  fetchUrl: (url: string) =>
    post<{ ok: boolean; title: string; text: string; source?: string; message?: string }>('/api/fetch_url', { url }),

  cleanScenes: (text: string, groupWords: number) =>
    post<{ scenes: SceneDraft[]; title: string }>('/api/clean_scenes', { text, group_words: groupWords }),

  annotate: async (texts: string[], useAi: boolean): Promise<AnnotateResult[]> => {
    const data = await post<{ ok: boolean; results: AnnotateResult[] }>('/api/annotate', {
      texts,
      use_ai: useAi,
    });
    return data.results ?? [];
  },

  direct: (text: string, useAi: boolean) => post<DirectResult>('/api/direct', { text, use_ai: useAi }),

  synthesize: (payload: Record<string, unknown>) => post<SynthesizeResult>('/api/synthesize', payload),

  enqueue: (payload: Record<string, unknown>) =>
    post<{ ok: boolean; job_id: string; status: string }>('/api/queue/enqueue', payload),

  queueList: () => get<QueueList>('/api/queue/list'),

  queueJob: (id: string) => get<{ ok: boolean; job: QueueJob }>(`/api/queue/jobs/${id}`),

  clearDone: () => post<{ ok: boolean; deleted: number }>('/api/queue/clear_done', {}),

  cancelJob: (id: string) => post<{ ok: boolean; message?: string }>(`/api/queue/cancel/${id}`, {}),

  removeJob: (id: string) => post<{ ok: boolean; message?: string }>(`/api/queue/remove/${id}`, {}),

  history: () => get<HistoryResponse>('/api/history'),

  /** Sampel singkat: Pocket-TTS memakai referensi, mesin lain disintesis lalu di-cache. */
  voiceSample: (engine: string, voice: string, refresh = false) =>
    post<{ ok: boolean; audio_url: string; cached?: boolean; message?: string }>('/api/voice_sample', {
      engine,
      voice,
      refresh,
    }),

  /** Hapus satu berkas hasil. `url` berbentuk /output/<folder>/<berkas>.wav */
  deleteFile: async (url: string): Promise<void> => {
    const rel = url.replace(/^\/output\//, '').replace(/^\/+/, '');
    await parse<{ ok: boolean }>(
      await fetch(`/api/history/file/${rel.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      }),
    );
  },

  deleteFolder: async (folder: string): Promise<void> => {
    await parse<{ ok: boolean }>(
      await fetch(`/api/history/folder/${encodeURIComponent(folder)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      }),
    );
  },

  sampleUrl: (voiceId: string) => `/api/sample/${encodeURIComponent(voiceId)}`,
  zipUrl: (folder: string) => `/api/zip/${encodeURIComponent(folder)}`,
};
