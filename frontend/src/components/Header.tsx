import { ThemeToggle } from '@fieldnote-ui/ui';
import type { EngineState } from '../types';
import { StatusDot } from './ui';

export function Header({
  engines,
  title,
}: {
  engines: Record<string, EngineState>;
  title: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-fn-border pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="fn-kicker">TTS Indonesia · Studio lokal</p>
          <h1
            className="m-0"
            style={{
              fontFamily: 'var(--fn-font-display)',
              fontSize: 'var(--fn-text-3xl)',
              letterSpacing: 'var(--fn-tracking-tight)',
              lineHeight: 'var(--fn-leading-3xl)',
            }}
          >
            {title || 'Studio Narasi'}
          </h1>
          <p className="mt-1 max-w-prose text-sm text-fn-text-secondary">
            Naskah → teks bersih → ekspresi &amp; jeda → audio. Supertonic dan Pocket-TTS berjalan di mesin ini.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusItem name="Supertonic" state={engines.supertonic} />
        <StatusItem name="Pocket-TTS" state={engines.pocket_tts} />
        <StatusItem name="Gemini" state={engines.gemini_tts} />
        <StatusItem name="OmniRoute" state={engines.gemini_gw} />
      </div>
    </header>
  );
}

function StatusItem({ name, state }: { name: string; state?: EngineState }) {
  return (
    <span className="fn-row" style={{ gap: 'var(--fn-space-1-5)' }}>
      <span className="fn-meta" style={{ color: 'var(--fn-color-text-secondary)' }}>
        {name}
      </span>
      <StatusDot state={state} />
    </span>
  );
}
