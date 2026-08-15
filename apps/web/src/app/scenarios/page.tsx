'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  baselineOf,
  chronicle,
  conditionFrames,
  encodePermalink,
  formatYear,
  runScenario,
  SCENARIO_PACKS,
  type Scenario,
  type WorldEvent,
} from '@genesis/replay';
import { ConditionLegend, WorldView } from '@/components/WorldView';
import { ModeBadge } from '@/components/ModeBadge';

// Two worlds, one clock. The left map is what happened; the right is what
// happened instead. Everything on this page runs in the browser.

const SEVERITY_COLOR: Record<WorldEvent['severity'], string> = {
  bad: '#d55181',
  good: '#199e70',
  neutral: '#3987e5',
};

function build(pack: Scenario) {
  const regions = pack.regions.length === 0 ? [''] : pack.regions;

  const scenario = runScenario(pack);
  const baseline = runScenario(baselineOf(pack));

  const left = conditionFrames(baseline.run, regions);
  const right = conditionFrames(scenario.run, regions);

  // One scale across both maps, or the two timelines cannot be compared by eye.
  let peak = 1;
  for (const frames of [left, right]) {
    for (const frame of frames) {
      for (const condition of frame.regions) {
        if (condition.population > peak) peak = condition.population;
      }
    }
  }

  return {
    regions,
    baselineFrames: left,
    scenarioFrames: right,
    events: chronicle(scenario.run, regions),
    baselineEvents: chronicle(baseline.run, regions),
    populationScale: peak,
    token: encodePermalink(pack),
    terminalHash: scenario.terminalHash,
    identical: scenario.terminalHash === baseline.terminalHash,
  };
}

export default function Scenarios() {
  const [selected, setSelected] = useState(SCENARIO_PACKS[0]?.id ?? '');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const pack = SCENARIO_PACKS.find((p) => p.id === selected);

  const view = useMemo(() => {
    if (pack === undefined) return undefined;
    try {
      return build(pack);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [pack]);

  const ready = typeof view === 'object' && view !== undefined ? view : undefined;
  const frameCount = ready?.scenarioFrames.length ?? 0;
  const at = Math.min(index, Math.max(frameCount - 1, 0));

  const scenarioFrame = ready?.scenarioFrames[at];
  const baselineFrame = ready?.baselineFrames[at];
  const year = scenarioFrame?.year ?? 0;

  const frame = useRef<number>();
  useEffect(() => {
    if (!playing || frameCount === 0) return;
    let last = 0;
    const step = (now: number) => {
      // ~24 frames a second, so five thousand years takes about ten seconds.
      if (now - last > 42) {
        last = now;
        setIndex((current) => {
          if (current + 1 >= frameCount) {
            setPlaying(false);
            return frameCount - 1;
          }
          return current + 1;
        });
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    // requestAnimationFrame stops in a background tab, so playback would sit
    // there reading "Pause" with nothing moving. Stop it honestly instead.
    const onHide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [playing, frameCount]);

  // The chronicle up to now, newest first, so the feed reads like it is arriving.
  const sofar = useMemo(() => {
    if (ready === undefined || scenarioFrame === undefined) return [];
    return ready.events.filter((e) => e.tick <= scenarioFrame.tick).slice(-14).reverse();
  }, [ready, scenarioFrame]);

  const divergence = useMemo(() => {
    if (ready === undefined) return undefined;
    const only = new Set(ready.events.map((e) => `${e.tick}:${e.region}:${e.headline}`));
    const base = new Set(ready.baselineEvents.map((e) => `${e.tick}:${e.region}:${e.headline}`));
    return {
      gained: ready.events.filter((e) => !base.has(`${e.tick}:${e.region}:${e.headline}`)).length,
      lost: ready.baselineEvents.filter((e) => !only.has(`${e.tick}:${e.region}:${e.headline}`))
        .length,
    };
  }, [ready]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Timelines</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Change one thing and watch the next five thousand years go differently.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {SCENARIO_PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelected(p.id);
              setIndex(0);
              setPlaying(false);
            }}
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

      {typeof view === 'string' && <p className="mt-8 text-sm text-ink">{view}</p>}

      {pack !== undefined && ready !== undefined && (
        <>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-secondary">{pack.note}</p>

          {/* Transport */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
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
            <span className="w-28 text-right font-mono text-lg tabular-nums text-ink">
              {formatYear(year)}
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <WorldView
              title="WHAT HAPPENED"
              subtitle="nothing touched"
              conditions={baselineFrame?.regions ?? []}
              populationScale={ready.populationScale}
              dimmed
            />
            <WorldView
              title="THIS TIMELINE"
              subtitle={pack.title}
              conditions={scenarioFrame?.regions ?? []}
              populationScale={ready.populationScale}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <ConditionLegend />
            {divergence !== undefined && (
              <span className="font-mono text-[11px] text-ink-muted">
                {ready.identical
                  ? 'identical to the baseline'
                  : `${divergence.gained} events that did not happen otherwise, ${divergence.lost} that no longer do`}
              </span>
            )}
          </div>

          <h2 className="mt-12 text-lg font-semibold tracking-[-0.01em] text-ink">
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
                <span className="w-24 font-mono text-xs tabular-nums text-ink-muted">
                  {formatYear(event.year)}
                </span>
                <span className="w-16 font-mono text-xs text-ink-secondary">
                  {event.region || '—'}
                </span>
                <span
                  className="text-sm text-ink"
                  style={{ color: SEVERITY_COLOR[event.severity] }}
                >
                  {event.headline}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">{event.detail}</span>
              </li>
            ))}
          </ol>

          <details className="mt-12 border-t border-rule pt-6">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
              The numbers behind it
            </summary>
            <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[9rem_1fr]">
              <dt className="label">Years</dt>
              <dd className="font-mono text-xs tabular-nums text-ink">
                {formatYear(ready.scenarioFrames[0]?.year ?? 0)} to{' '}
                {formatYear(ready.scenarioFrames[frameCount - 1]?.year ?? 0)}
              </dd>
              <dt className="label">Terminal hash</dt>
              <dd className="break-all font-mono text-xs text-ink-secondary">
                {ready.terminalHash}
              </dd>
              <dt className="label">Permalink</dt>
              <dd className="break-all font-mono text-[11px] leading-relaxed text-ink-muted">
                {ready.token}
              </dd>
            </dl>
            {Object.keys(pack.overrides).length > 0 && (
              <ul className="mt-4">
                {Object.entries(pack.overrides).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-2 font-mono text-xs"
                  >
                    <span className="text-ink-secondary">{key}</span>
                    <span className="tabular-nums text-ink">{value}</span>
                  </li>
                ))}
              </ul>
            )}
            {pack.interventions.map((intervention) => (
              <p
                key={`${intervention.tick}:${intervention.stateKey}`}
                className="mt-3 text-xs leading-relaxed text-ink-muted"
              >
                <span className="font-mono text-ink-secondary">
                  {formatYear(intervention.tick - 3000)} · {intervention.stateKey} ={' '}
                  {intervention.value}
                </span>
                <br />
                {intervention.rationale}
              </p>
            ))}
          </details>
        </>
      )}

      <p className="label mt-10">Genesis does not claim Sandbox output means anything.</p>
    </main>
  );
}
