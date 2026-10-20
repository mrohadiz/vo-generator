import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { useHistory, useOptions, useQueue, useStatus } from './hooks';
import {
  ENGINE_LABEL,
  engineLabel,
  estimateAudioSeconds,
  fmtDur,
  getRtf,
  learnRtf,
} from './lib';
import type {
  AnnotateInfo,
  Character,
  DirectResult,
  Engine,
  EngineId,
  Mode,
  SceneDraft,
  SynthesizeResult,
  TheaterScene,
} from './types';
import { Header } from './components/Header';
import { ProjectBar } from './components/ProjectBar';
import { ModeTabs } from './components/ModeTabs';
import { SinglePanel } from './components/SinglePanel';
import { ScenePanel } from './components/ScenePanel';
import { TheaterPanel } from './components/TheaterPanel';
import { EnginePanel } from './components/EnginePanel';
import { ResultPanel } from './components/ResultPanel';
import { QueuePanel } from './components/QueuePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Notice } from './components/ui';

interface Flash {
  tone: 'info' | 'warning' | 'danger';
  text: string;
}

export default function App() {
  const { engines } = useOptions();
  const engineStatus = useStatus();
  const queue = useQueue();
  const history = useHistory();

  const [mode, setMode] = useState<Mode>('single');
  const [title, setTitle] = useState('');
  const [flash, setFlash] = useState<Flash | null>(null);

  /* ── Mesin & suara ─────────────────────────────────────────────────── */
  const [engineId, setEngineId] = useState<EngineId>('supertonic');
  const [voiceId, setVoiceId] = useState('M1');
  const [speed, setSpeed] = useState(1);
  const [style, setStyle] = useState('');

  const engine = useMemo(() => engines.find((e) => e.id === engineId), [engines, engineId]);

  useEffect(() => {
    if (!engine) return;
    if (!engine.voices.some((v) => v.id === voiceId)) {
      setVoiceId(engine.voices[0]?.id ?? '');
    }
  }, [engine, voiceId]);

  useEffect(() => {
    if (engine?.default_style && !style) setStyle(engine.default_style);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine?.id]);

  /* ── Mode tanpa scene ──────────────────────────────────────────────── */
  const [rawText, setRawText] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof api.clean>> | null>(null);
  const [singleInfo, setSingleInfo] = useState<AnnotateInfo | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);

  /* ── Mode dengan scene ─────────────────────────────────────────────── */
  const [sceneRaw, setSceneRaw] = useState('');
  const [groupWords, setGroupWords] = useState(0);
  const [scenes, setScenes] = useState<SceneDraft[]>([]);
  const [scenesInfo, setScenesInfo] = useState<AnnotateInfo | null>(null);
  const [cleaningScenes, setCleaningScenes] = useState(false);
  const [annotatingScenes, setAnnotatingScenes] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);

  /* ── Mode teater ───────────────────────────────────────────────────── */
  const [theaterRaw, setTheaterRaw] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [theaterScenes, setTheaterScenes] = useState<TheaterScene[]>([]);
  const [theaterInfo, setTheaterInfo] = useState<AnnotateInfo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [theaterError, setTheaterError] = useState<string | null>(null);
  const [tryingName, setTryingName] = useState<string | null>(null);
  const [drama3Available, setDrama3Available] = useState(false);

  /* ── Hasil & proses ────────────────────────────────────────────────── */
  const [result, setResult] = useState<SynthesizeResult | null>(null);
  const [sceneResults, setSceneResults] = useState<SynthesizeResult[]>([]);
  const [resultFolder, setResultFolder] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [etaText, setEtaText] = useState('');
  const etaTimer = useRef<number | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  /* ── Handler: teks ─────────────────────────────────────────────────── */

  const handleClean = useCallback(async () => {
    setCleaning(true);
    setSingleError(null);
    try {
      const data = await api.clean(rawText);
      setAnalysis(data);
      setCleanedText(data.cleaned_text);
      if (data.title) setTitle((t) => t || data.title || '');
      await history.refresh();
    } catch (e) {
      setSingleError((e as Error).message);
    } finally {
      setCleaning(false);
    }
  }, [rawText, history]);

  const handleAnnotate = useCallback(async () => {
    setAnnotating(true);
    setSingleError(null);
    try {
      const [first] = await api.annotate([cleanedText], true);
      if (first) {
        setCleanedText(first.text);
        setSingleInfo(first.info);
      }
    } catch (e) {
      setSingleError((e as Error).message);
    } finally {
      setAnnotating(false);
    }
  }, [cleanedText]);

  const handleCleanScenes = useCallback(async () => {
    setCleaningScenes(true);
    setSceneError(null);
    try {
      const data = await api.cleanScenes(sceneRaw, groupWords);
      setScenes(data.scenes ?? []);
      if (data.title) setTitle((t) => t || data.title || '');
    } catch (e) {
      setSceneError((e as Error).message);
    } finally {
      setCleaningScenes(false);
    }
  }, [sceneRaw, groupWords]);

  const handleAnnotateScenes = useCallback(async () => {
    if (scenes.length === 0) return;
    setAnnotatingScenes(true);
    setSceneError(null);
    try {
      const results = await api.annotate(
        scenes.map((s) => s.cleaned_text),
        true,
      );
      setScenes((prev) =>
        prev.map((scene, i) => (results[i] ? { ...scene, cleaned_text: results[i].text } : scene)),
      );
      setScenesInfo(results[0]?.info ?? null);
    } catch (e) {
      setSceneError((e as Error).message);
    } finally {
      setAnnotatingScenes(false);
    }
  }, [scenes]);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setTheaterError(null);
    try {
      const data: DirectResult = await api.direct(theaterRaw, useAi);
      setCharacters(data.characters ?? []);
      setTheaterScenes(data.scenes ?? []);
      setTheaterInfo(data.info ?? null);
      setDrama3Available(Boolean(data.drama3_available));
      if (data.title) setTitle((t) => t || data.title);
    } catch (e) {
      setTheaterError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }, [theaterRaw, useAi]);

  /* ── Handler: teater ───────────────────────────────────────────────── */

  const handleCharacterChange = useCallback((name: string, patch: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.name === name ? { ...c, ...patch } : c)));
  }, []);

  const handleLineChange = useCallback(
    (sceneIndex: number, lineIndex: number, patch: Partial<TheaterScene['lines'][number]>) => {
      setTheaterScenes((prev) =>
        prev.map((scene, si) =>
          si === sceneIndex
            ? {
                ...scene,
                lines: scene.lines.map((line, li) => (li === lineIndex ? { ...line, ...patch } : line)),
              }
            : scene,
        ),
      );
    },
    [],
  );

  const linePayload = useCallback(
    (scene: TheaterScene) =>
      scene.lines.map((line) => {
        const c = characters.find((x) => x.name === line.speaker) ?? characters[0];
        return {
          text: line.text,
          voice: c?.voice ?? 'M1',
          speed: c?.speed ?? 1,
          pitch: c?.pitch ?? 0,
          provider: c?.provider ?? 'supertonic',
          name: c?.name ?? line.speaker,
          description: c?.voice_description ?? '',
          emotion: line.emotion || 'netral',
          pause: line.pause || 0,
          gemini_voice: c?.gemini_voice ?? 'Zubenelgenubi',
        };
      }),
    [characters],
  );

  const handleTryVoice = useCallback(
    async (name: string) => {
      setTryingName(name);
      try {
        const c = characters.find((x) => x.name === name);
        const sample =
          theaterScenes.flatMap((s) => s.lines).find((l) => l.speaker === name)?.text ||
          'Halo, ini contoh suara saya dalam cerita ini.';
        const data = await api.synthesize({
          preview: true,
          lines: [
            {
              text: sample.slice(0, 160),
              voice: c?.voice ?? 'M1',
              speed: c?.speed ?? 1,
              pitch: c?.pitch ?? 0,
              provider: c?.provider ?? 'supertonic',
              name: c?.name ?? name,
              description: c?.voice_description ?? '',
              emotion: 'netral',
              pause: 0,
              gemini_voice: c?.gemini_voice ?? 'Zubenelgenubi',
            },
          ],
        });
        const audio = new Audio(`${data.audio_url}?t=${Date.now()}`);
        void audio.play().catch(() => undefined);
      } catch (e) {
        setTheaterError((e as Error).message);
      } finally {
        setTryingName(null);
      }
    },
    [characters, theaterScenes],
  );

  /* ── Handler: generate ─────────────────────────────────────────────── */

  const buildJobs = useCallback((): Array<Record<string, unknown>> => {
    const base = { title, engine: engineId, voice: voiceId, speed, style: style.trim() || undefined };
    if (mode === 'single') {
      return [{ ...base, text: cleanedText }];
    }
    if (mode === 'scene') {
      return scenes.map((scene, i) => ({ ...base, text: scene.cleaned_text, scene: i + 1 }));
    }
    return theaterScenes.map((scene, i) => ({ title, lines: linePayload(scene), scene: i + 1 }));
  }, [mode, title, engineId, voiceId, speed, style, cleanedText, scenes, theaterScenes, linePayload]);

  const validate = useCallback((): string | null => {
    if (mode === 'single' && !cleanedText.trim()) return 'Naskah belum dibersihkan atau kosong.';
    if (mode === 'scene' && scenes.length === 0) return 'Rapikan naskah jadi scene terlebih dahulu.';
    if (mode === 'theater' && theaterScenes.length === 0) return 'Analisis cerita terlebih dahulu.';
    return null;
  }, [mode, cleanedText, scenes.length, theaterScenes.length]);

  const startEta = useCallback(
    (audioSeconds: number, label: (elapsed: number, left: number) => string) => {
      const started = Date.now();
      const total = audioSeconds * getRtf(engineId);
      if (etaTimer.current) window.clearInterval(etaTimer.current);
      etaTimer.current = window.setInterval(() => {
        const elapsed = (Date.now() - started) / 1000;
        setEtaText(label(elapsed, Math.max(0, total - elapsed)));
      }, 1000);
      setEtaText(label(0, total));
    },
    [engineId],
  );

  const stopEta = useCallback(() => {
    if (etaTimer.current) {
      window.clearInterval(etaTimer.current);
      etaTimer.current = null;
    }
    setEtaText('');
  }, []);

  useEffect(() => () => stopEta(), [stopEta]);

  const handleEnqueue = useCallback(async () => {
    const problem = validate();
    if (problem) {
      setFlash({ tone: 'warning', text: problem });
      return;
    }
    setBusy(true);
    try {
      const jobs = buildJobs();
      for (const job of jobs) await api.enqueue(job);
      setFlash({ tone: 'info', text: `${jobs.length} pekerjaan masuk antrian.` });
      await queue.refresh();
    } catch (e) {
      setFlash({ tone: 'danger', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }, [buildJobs, queue, validate]);

  const handleGenerateDirect = useCallback(async () => {
    const problem = validate();
    if (problem) {
      setFlash({ tone: 'warning', text: problem });
      return;
    }
    setBusy(true);
    setWarnings([]);
    setResult(null);
    setSceneResults([]);
    setResultFolder('');
    const jobs = buildJobs();
    const audioSeconds = jobs.reduce((sum, job) => {
      const text =
        typeof job.text === 'string'
          ? job.text
          : Array.isArray(job.lines)
            ? job.lines.map((l) => String((l as { text?: string }).text ?? '')).join(' ')
            : '';
      return sum + estimateAudioSeconds(text);
    }, 0);
    startEta(audioSeconds, (elapsed, left) =>
      left > 0
        ? `Berjalan ${fmtDur(elapsed)} · sisa ±${fmtDur(left)}`
        : `Berjalan ${fmtDur(elapsed)} · sedikit lagi…`,
    );
    try {
      if (jobs.length === 1 && mode !== 'scene') {
        const first = jobs[0];
        if (!first) throw new Error('Tidak ada pekerjaan untuk dijalankan.');
        const data = await api.synthesize(first);
        setResult(data);
        setResultFolder(data.folder);
        setWarnings(data.warnings ?? []);
        learnRtf(data.engine, data.process_time_sec, data.duration_sec);
      } else {
        const collected: SynthesizeResult[] = [];
        const allWarnings: string[] = [];
        for (const job of jobs) {
          const data = await api.synthesize(job);
          collected.push(data);
          setResultFolder(data.folder);
          allWarnings.push(...(data.warnings ?? []));
          setSceneResults([...collected]);
          learnRtf(data.engine, data.process_time_sec, data.duration_sec);
        }
        setWarnings(allWarnings);
      }
      setFlash({ tone: 'info', text: 'Sintesis selesai.' });
      await history.refresh();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : (e as Error).message;
      setFlash({ tone: 'danger', text: message });
    } finally {
      stopEta();
      setBusy(false);
    }
  }, [buildJobs, history, mode, startEta, stopEta, validate]);

  const handleFetchUrl = useCallback(
    async (url: string) => {
      setFetchingUrl(true);
      try {
        const data = await api.fetchUrl(url);
        if (!data.ok) throw new Error(data.message ?? 'Gagal mengambil halaman.');
        if (data.title) setTitle((t) => t || data.title);
        if (mode === 'single') setRawText(data.text);
        else if (mode === 'scene') setSceneRaw(data.text);
        else setTheaterRaw(data.text);
        setFlash({ tone: 'info', text: `Naskah diambil dari ${data.source ?? url}.` });
      } finally {
        setFetchingUrl(false);
      }
    },
    [mode],
  );

  /* ── Turunan tampilan ──────────────────────────────────────────────── */

  const engineNotice = useMemo<{ tone: 'warning' | 'info' | 'danger'; text: string } | null>(() => {
    if (!engine) return null;
    const state = engineStatus[engine.id];
    if (state?.error) return { tone: 'danger', text: `Mesin gagal dimuat: ${state.error}` };
    if (state && !state.ready && !state.loading) {
      return { tone: 'warning', text: 'Mesin belum siap. Lihat pesan galat di terminal server.' };
    }
    if (state?.loading) return { tone: 'info', text: 'Mesin sedang dimuat di latar belakang…' };
    if (engine.id === 'pocket_tts' && engine.voices.length === 0) {
      return { tone: 'warning', text: 'Belum ada sampel suara di folder suara-kloning/.' };
    }
    if (engine.id === 'drama3' && !drama3Available) {
      return { tone: 'warning', text: 'Drama 3 belum dikonfigurasi (HF_TOKEN / DRAMA3_URL).' };
    }
    return null;
  }, [engine, engineStatus, drama3Available]);

  const busyLabel = busy ? 'Memproses…' : '';

  return (
    <div className="fn-shell">
      <Header engines={engineStatus} title={title} />

      <div className="fn-stack" style={{ gap: 'var(--fn-space-5)' }}>
        <ProjectBar
          title={title}
          onTitleChange={setTitle}
          onFetchUrl={handleFetchUrl}
          fetching={fetchingUrl}
        />

        <ModeTabs mode={mode} onChange={setMode} />

        {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            {mode === 'single' ? (
              <SinglePanel
                rawText={rawText}
                onRawChange={setRawText}
                cleanedText={cleanedText}
                onCleanedChange={setCleanedText}
                analysis={analysis}
                onClean={handleClean}
                cleaning={cleaning}
                onAnnotate={handleAnnotate}
                annotating={annotating}
                annotateInfo={singleInfo}
                error={singleError}
              />
            ) : mode === 'scene' ? (
              <ScenePanel
                sceneRaw={sceneRaw}
                onSceneRawChange={setSceneRaw}
                groupWords={groupWords}
                onGroupWordsChange={setGroupWords}
                scenes={scenes}
                onCleanScenes={handleCleanScenes}
                cleaning={cleaningScenes}
                onSceneChange={(index, text) =>
                  setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, cleaned_text: text } : s)))
                }
                onAnnotateScenes={handleAnnotateScenes}
                annotating={annotatingScenes}
                annotateInfo={scenesInfo}
                onGenerate={handleEnqueue}
                busy={busy || cleaningScenes}
                error={sceneError}
              />
            ) : (
              <TheaterPanel
                raw={theaterRaw}
                onRawChange={setTheaterRaw}
                useAi={useAi}
                onUseAiChange={setUseAi}
                onAnalyze={handleAnalyze}
                analyzing={analyzing}
                info={theaterInfo}
                characters={characters}
                scenes={theaterScenes}
                engines={engines as Engine[]}
                onCharacterChange={handleCharacterChange}
                onLineChange={handleLineChange}
                onTryVoice={handleTryVoice}
                tryingName={tryingName}
                onGenerate={handleEnqueue}
                busy={busy}
                error={theaterError}
              />
            )}
          </div>

          <aside className="lg:sticky" style={{ top: 'var(--fn-space-4)' }}>
            <EnginePanel
              engines={engines}
              engineId={engineId}
              onEngineChange={setEngineId}
              voiceId={voiceId}
              onVoiceChange={setVoiceId}
              speed={speed}
              onSpeedChange={setSpeed}
              style={style}
              onStyleChange={setStyle}
              onGenerate={handleEnqueue}
              onGenerateDirect={handleGenerateDirect}
              busy={busy}
              etaText={busyLabel || etaText}
              notice={engineNotice}
              disabled={engineStatus[engineId] ? !engineStatus[engineId].ready : false}
            />
            {engineId !== 'supertonic' ? (
              <p className="fn-meta mt-2" style={{ textAlign: 'center' }}>
                Mode teater memakai penyedia per tokoh, bukan pilihan di panel ini.
              </p>
            ) : null}
          </aside>
        </div>

        <ResultPanel
          result={result}
          sceneResults={sceneResults}
          folder={resultFolder}
          warnings={warnings}
        />

        <QueuePanel
          items={queue.items}
          queued={queue.queued}
          error={queue.error}
          onRefresh={queue.refresh}
          onCancel={(id) => void queue.cancel(id)}
          onRemove={(id) => void queue.remove(id)}
          onClearDone={() => void queue.clearDone()}
        />

        <HistoryPanel
          data={history}
          loading={history.loading}
          error={history.error}
          onRefresh={history.refresh}
        />

        <p className="fn-meta" style={{ textAlign: 'center' }}>
          {engines.length} mesin tersedia · {engineLabel(engineId)} aktif ·{' '}
          {Object.keys(ENGINE_LABEL).length} penyedia dikenal
        </p>
      </div>
    </div>
  );
}
