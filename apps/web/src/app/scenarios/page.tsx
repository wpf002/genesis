'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  encodePermalink,
  formatYear,
  SCENARIO_PACKS,
  workUnits,
  type Frame,
  type Scenario,
  type WorldEvent,
} from '@genesis/replay';
import type { WorldMessage } from '@/lib/world.worker';
import { ConditionLegend, WorldView, countryName } from '@/components/WorldView';
import { ModeBadge } from '@/components/ModeBadge';

// Two worlds, one clock. The left map is what happened; the right is what
// happened instead. The run itself is done in a worker — 177 countries over five
// thousand years is twelve seconds of arithmetic and it must not freeze the page.

/** Nothing after this year had anything to check it against. */
const LAST_OBSERVED_YEAR = 2025;

const SEVERITY_COLOR: Record<WorldEvent['severity'], string> = {
  bad: '#d55181',
  good: '#199e70',
  neutral: '#3987e5',
};

interface Loaded {
  frames: readonly Frame[];
  baselineFrames: readonly Frame[] | null;
  events: readonly WorldEvent[];
  baselineEvents: readonly WorldEvent[];
  terminalHash: string;
  identical: boolean;
  elapsedMs: number;
}

export default function Scenarios() {
  const [selected, setSelected] = useState(SCENARIO_PACKS[0]?.id ?? '');
  const [loaded, setLoaded] = useState<Loaded | undefined>();
  const [progress, setProgress] = useState<{ fraction: number; phase: string } | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const pack = SCENARIO_PACKS.find((p) => p.id === selected);
  const worker = useRef<Worker>();

  const start = useCallback((scenario: Scenario) => {
    worker.current?.terminate();
    setLoaded(undefined);
    setFailure(undefined);
    setPlaying(false);
    setIndex(0);
    setProgress({ fraction: 0, phase: 'Starting' });

    const next = new Worker(new URL('../../lib/world.worker.ts', import.meta.url));
    worker.current = next;
    next.onmessage = (event: MessageEvent<WorldMessage>) => {
      const message = event.data;
      if (message.kind === 'progress') {
        setProgress({ fraction: message.fraction, phase: message.phase });
      } else if (message.kind === 'error') {
        setFailure(message.message);
        setProgress(undefined);
      } else {
        setLoaded(message);
        setProgress(undefined);
      }
    };
    next.postMessage({
      scenario,
      withBaseline:
        Object.keys(scenario.overrides).length > 0 || scenario.interventions.length > 0,
    });
  }, []);

  useEffect(() => {
    if (pack !== undefined) start(pack);
    return () => worker.current?.terminate();
  }, [pack, start]);

  const frameCount = loaded?.frames.length ?? 0;
  const at = Math.min(index, Math.max(frameCount - 1, 0));
  const frame = loaded?.frames[at];
  const baselineFrame = loaded?.baselineFrames?.[at];
  const year = frame?.year ?? 0;
  const isForecast = year > LAST_OBSERVED_YEAR;

  const raf = useRef<number>();
  useEffect(() => {
    if (!playing || frameCount === 0) return;
    let last = 0;
    const step = (now: number) => {
      if (now - last > 40) {
        last = now;
        setIndex((current) => {
          if (current + 1 >= frameCount) {
            setPlaying(false);
            return frameCount - 1;
          }
          return current + 1;
        });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    const onHide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      if (raf.current !== undefined) cancelAnimationFrame(raf.current);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [playing, frameCount]);

  const sofar = useMemo(() => {
    if (loaded === undefined || frame === undefined) return [];
    return loaded.events.filter((e) => e.tick <= frame.tick).slice(-16).reverse();
  }, [loaded, frame]);

  const biggest = useMemo(() => {
    if (frame === undefined) return [];
    return [...frame.regions].sort((a, b) => b.population - a.population).slice(0, 8);
  }, [frame]);

  const divergence = useMemo(() => {
    if (loaded === undefined || loaded.baselineFrames === null) return undefined;
    const key = (e: WorldEvent) => `${e.tick}:${e.region}:${e.headline}`;
    const base = new Set(loaded.baselineEvents.map(key));
    const mine = new Set(loaded.events.map(key));
    return {
      gained: loaded.events.filter((e) => !base.has(key(e))).length,
      lost: loaded.baselineEvents.filter((e) => !mine.has(key(e))).length,
    };
  }, [loaded]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Timelines</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Every country on the map, 3000 BC to AD 2100. Change one thing and watch it
            all go differently.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {SCENARIO_PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
              p.id === selected
                ? 'border-ink bg-surface text-ink'
                : 'border-rule text-ink-secondary hover:bg-surface'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {pack !== undefined && (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-secondary">{pack.note}</p>
      )}

      {failure !== undefined && (
        <p
          className="mt-6 rounded border-l-2 bg-surface p-4 text-sm text-ink"
          style={{ borderColor: '#d55181' }}
        >
          {failure}
        </p>
      )}

      {progress !== undefined && pack !== undefined && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between font-mono text-xs text-ink-secondary">
            <span>{progress.phase}</span>
            <span className="tabular-nums">
              {Math.round(progress.fraction * 100)}% ·{' '}
              {workUnits(pack).toLocaleString('en-US')} country-years
            </span>
          </div>
          <div className="mt-2 h-1 w-full rounded bg-rule">
            <div
              className="h-1 rounded transition-[width] duration-150"
              style={{
                width: `${Math.max(2, progress.fraction * 100)}%`,
                background: 'var(--series-1)',
              }}
            />
          </div>
        </div>
      )}

      {loaded !== undefined && frame !== undefined && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (at >= frameCount - 1) setIndex(0);
                  setPlaying(true);
                }
              }}
              className="rounded border border-rule px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(frameCount - 1, 0)}
              value={at}
              aria-label="year"
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              className="h-1 min-w-48 flex-1 accent-[var(--series-1)]"
            />
            <span className="w-32 text-right font-mono text-lg tabular-nums text-ink">
              {formatYear(year)}
            </span>
          </div>

          {isForecast && (
            <p
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em]"
              style={{ color: '#9085e9' }}
            >
              Forecast — past this point nothing checks the model
            </p>
          )}

          <div
            className={`mt-6 grid gap-6 ${loaded.baselineFrames !== null ? 'lg:grid-cols-2' : ''}`}
          >
            {loaded.baselineFrames !== null && baselineFrame !== undefined && (
              <WorldView
                title="What happened"
                subtitle="nothing touched"
                conditions={baselineFrame.regions}
                forecast={isForecast}
              />
            )}
            <WorldView
              title={loaded.baselineFrames !== null ? 'This timeline' : 'The world'}
              subtitle={pack?.title ?? ''}
              conditions={frame.regions}
              forecast={isForecast}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <ConditionLegend />
            <span className="font-mono text-[11px] text-ink-muted">
              {divergence === undefined
                ? `${frame.regions.length} countries · ${(loaded.elapsedMs / 1000).toFixed(1)}s to run`
                : loaded.identical
                  ? 'identical to the baseline'
                  : `${divergence.gained} events that would not have happened, ${divergence.lost} that no longer do`}
            </span>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_16rem]">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
                What happened, as it happens
              </h2>
              <ol className="mt-4 min-h-64">
                {sofar.length === 0 && (
                  <li className="py-3 font-mono text-xs text-ink-muted">
                    Nothing yet. Press play.
                  </li>
                )}
                {sofar.map((event) => (
                  <li
                    key={`${event.tick}-${event.region}-${event.headline}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-2.5"
                  >
                    <span className="w-20 font-mono text-xs tabular-nums text-ink-muted">
                      {formatYear(event.year)}
                    </span>
                    <span className="w-36 truncate text-xs text-ink-secondary">
                      {countryName(event.region)}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: SEVERITY_COLOR[event.severity] }}
                    >
                      {event.headline}
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">{event.detail}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
                Most people
              </h2>
              <ol className="mt-4">
                {biggest.map((condition) => (
                  <li
                    key={condition.region}
                    className="flex items-baseline justify-between gap-2 border-b border-rule py-2"
                  >
                    <span className="truncate text-xs text-ink-secondary">
                      {countryName(condition.region)}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-ink">
                      {Math.round(condition.population).toLocaleString('en-US')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {pack !== undefined && (
            <details className="mt-12 border-t border-rule pt-6">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
                The numbers behind it
              </summary>
              <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[9rem_1fr]">
                <dt className="label">Countries</dt>
                <dd className="font-mono text-xs tabular-nums text-ink">
                  {frame.regions.length}
                </dd>
                <dt className="label">Years</dt>
                <dd className="font-mono text-xs tabular-nums text-ink">
                  {formatYear(loaded.frames[0]?.year ?? 0)} to{' '}
                  {formatYear(loaded.frames[frameCount - 1]?.year ?? 0)}
                </dd>
                <dt className="label">Terminal hash</dt>
                <dd className="break-all font-mono text-xs text-ink-secondary">
                  {loaded.terminalHash}
                </dd>
                <dt className="label">Permalink</dt>
                <dd className="break-all font-mono text-[11px] leading-relaxed text-ink-muted">
                  {encodePermalink(pack)}
                </dd>
              </dl>
              {Object.entries(pack.overrides).map(([key, value]) => (
                <p key={key} className="mt-2 font-mono text-xs text-ink-secondary">
                  {key} = <span className="text-ink">{value}</span>
                </p>
              ))}
            </details>
          )}
        </>
      )}
    </main>
  );
}
