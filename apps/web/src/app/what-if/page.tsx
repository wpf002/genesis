'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATALOGUE,
  ERAS,
  formatYear,
  type CatalogueEntry,
  type Confidence,
  type Expansion,
  type Frame,
  type WorldEvent,
} from '@genesis/replay';
import type { CounterfactualMessage } from '@/lib/counterfactual.worker';
import { ConditionLegend, WorldView, countryName } from '@/components/WorldView';
import { ModeBadge } from '@/components/ModeBadge';

// 180 counterfactuals. Pick one, watch both worlds run, read what changed.
//
// A subset of countries and a coarser span than the full world run, because this
// page is meant to be clicked through rather than waited on.

const REGIONS = [
  'ITA', 'GRC', 'TUR', 'EGY', 'ESP', 'FRA', 'TUN', 'DEU', 'GBR', 'RUS',
  'CHN', 'IND', 'USA', 'MEX', 'JPN', 'IRN', 'IRQ', 'POL', 'NLD', 'AUT',
  'SYR', 'ISR', 'MNG', 'PER', 'BRA', 'NGA', 'ETH', 'ZAF', 'CAN', 'AUS',
  'KOR', 'VNM', 'IDN', 'PAK', 'SAU', 'UKR', 'SWE', 'NOR', 'PRT', 'HUN',
];
const TICKS = 5100;
const LAST_OBSERVED_YEAR = 2025;

const CONFIDENCE_STYLE: Record<Confidence, { label: string; color: string }> = {
  high: { label: 'simulated', color: '#3987e5' },
  extrapolation: { label: 'knock-on', color: '#199e70' },
  speculative: { label: 'not modelled', color: '#c98500' },
};

const SEVERITY_COLOR: Record<WorldEvent['severity'], string> = {
  bad: '#d55181',
  good: '#199e70',
  neutral: '#3987e5',
};

interface Loaded {
  frames: readonly Frame[];
  baselineFrames: readonly Frame[];
  events: readonly WorldEvent[];
  expansion: Expansion;
  divergenceTick: number;
  elapsedMs: number;
}

export default function WhatIf() {
  const [era, setEra] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogueEntry | undefined>();
  const [loaded, setLoaded] = useState<Loaded | undefined>();
  const [progress, setProgress] = useState<{ fraction: number; phase: string } | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const worker = useRef<Worker>();

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return CATALOGUE.filter(
      (entry) =>
        (era === 'All' || entry.era === era) &&
        (text === '' ||
          entry.title.toLowerCase().includes(text) ||
          entry.premise.toLowerCase().includes(text)),
    );
  }, [era, query]);

  const run = useCallback((entry: CatalogueEntry) => {
    worker.current?.terminate();
    setSelected(entry);
    setLoaded(undefined);
    setFailure(undefined);
    setPlaying(false);
    setIndex(0);
    setProgress({ fraction: 0, phase: 'Starting' });

    const next = new Worker(new URL('../../lib/counterfactual.worker.ts', import.meta.url));
    worker.current = next;
    next.onmessage = (event: MessageEvent<CounterfactualMessage>) => {
      const message = event.data;
      if (message.kind === 'progress') setProgress({ fraction: message.fraction, phase: message.phase });
      else if (message.kind === 'error') {
        setFailure(message.message);
        setProgress(undefined);
      } else {
        setLoaded(message);
        setProgress(undefined);
        // Start just before the divergence so the split is the thing you watch.
        const at = message.frames.findIndex((f) => f.tick >= message.divergenceTick);
        setIndex(Math.max(0, at - 4));
        setPlaying(true);
      }
    };
    next.postMessage({ entryId: entry.id, regions: REGIONS, ticks: TICKS });
  }, []);

  useEffect(() => () => worker.current?.terminate(), []);

  const frameCount = loaded?.frames.length ?? 0;
  const at = Math.min(index, Math.max(frameCount - 1, 0));
  const frame = loaded?.frames[at];
  const baselineFrame = loaded?.baselineFrames[at];
  const year = frame?.year ?? 0;
  const isForecast = year > LAST_OBSERVED_YEAR;
  const diverged = frame !== undefined && loaded !== undefined && frame.tick >= loaded.divergenceTick;

  // A timer, not requestAnimationFrame: rAF does not fire in a background tab.
  useEffect(() => {
    if (!playing || frameCount === 0) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        if (current + 1 >= frameCount) {
          setPlaying(false);
          return frameCount - 1;
        }
        return current + 1;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [playing, frameCount]);

  const sofar = useMemo(() => {
    if (loaded === undefined || frame === undefined) return [];
    return loaded.events.filter((e) => e.tick <= frame.tick).slice(-12).reverse();
  }, [loaded, frame]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">What if</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            180 ways history could have gone. Pick one and watch both worlds run from
            the year it split.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 180 scenarios"
          className="w-56 rounded border border-rule bg-surface px-3 py-1.5 text-sm text-ink"
        />
        {['All', ...ERAS].map((name) => (
          <button
            key={name}
            onClick={() => setEra(name)}
            className={`rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
              name === era
                ? 'border-ink bg-surface text-ink'
                : 'border-rule text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="label mt-4">{shown.length} scenarios</p>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.map((entry) => (
          <li key={entry.id}>
            <button
              onClick={() => run(entry)}
              className={`w-full rounded border p-3 text-left transition-colors ${
                selected?.id === entry.id
                  ? 'border-ink bg-surface'
                  : 'border-rule hover:bg-surface'
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">
                  {String(entry.n).padStart(3, '0')}
                </span>
                <span className="text-sm text-ink">{entry.title}</span>
              </span>
              <span className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-ink-muted">
                  {formatYear(entry.year)}
                </span>
                <span className="truncate text-[11px] text-ink-muted">{entry.era}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {failure !== undefined && (
        <p
          className="mt-8 rounded border-l-2 bg-surface p-4 text-sm text-ink"
          style={{ borderColor: '#d55181' }}
        >
          {failure}
        </p>
      )}

      {progress !== undefined && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between font-mono text-xs text-ink-secondary">
            <span>{progress.phase}</span>
            <span className="tabular-nums">{Math.round(progress.fraction * 100)}%</span>
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

      {loaded !== undefined && selected !== undefined && frame !== undefined && (
        <section className="mt-12 border-t border-rule pt-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
            {selected.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
            {selected.premise}
          </p>
          <p className="mt-3 max-w-3xl border-l-2 border-rule pl-4 text-sm leading-relaxed text-ink-muted">
            <span className="text-ink-secondary">How it is run:</span>{' '}
            {selected.lever.reading}
          </p>

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
            <span className="w-32 text-right font-mono text-lg tabular-nums text-ink">
              {formatYear(year)}
            </span>
          </div>

          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em]">
            {!diverged ? (
              <span className="text-ink-muted">
                Before the split — both worlds identical
              </span>
            ) : isForecast ? (
              <span style={{ color: '#9085e9' }}>
                Forecast — past this point nothing checks the model
              </span>
            ) : (
              <span style={{ color: '#d55181' }}>
                Diverged in {formatYear(selected.year)}
              </span>
            )}
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <WorldView
              title="What happened"
              subtitle="nothing touched"
              conditions={baselineFrame?.regions ?? []}
              forecast={isForecast}
            />
            <WorldView
              title="What if"
              subtitle={selected.title}
              conditions={frame.regions}
              forecast={isForecast}
            />
          </div>

          <div className="mt-4">
            <ConditionLegend />
          </div>

          <h3 className="mt-12 text-lg font-semibold tracking-[-0.01em] text-ink">
            How it plays out
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loaded.expansion.stages.map((stage) => (
              <div key={stage.title} className="rounded border border-rule p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
                  {stage.title}
                  {stage.year !== null && (
                    <span className="ml-2 text-ink-muted">{formatYear(stage.year)}</span>
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                  {stage.summary}
                </p>
                <dl className="mt-3">
                  {stage.findings.map((finding) => (
                    <div key={finding.label} className="border-t border-rule py-2">
                      <dt className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-ink-muted">{finding.label}</span>
                        <span
                          className="font-mono text-[9px] uppercase tracking-[0.08em]"
                          style={{ color: CONFIDENCE_STYLE[finding.confidence].color }}
                        >
                          {CONFIDENCE_STYLE[finding.confidence].label}
                        </span>
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs text-ink">{finding.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-ink">
                What happened, as it happens
              </h3>
              <ol className="mt-4 min-h-48">
                {sofar.length === 0 && (
                  <li className="py-3 font-mono text-xs text-ink-muted">Nothing yet.</li>
                )}
                {sofar.map((event) => (
                  <li
                    key={`${event.tick}-${event.region}-${event.headline}`}
                    className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-2"
                  >
                    <span className="w-20 font-mono text-xs tabular-nums text-ink-muted">
                      {formatYear(event.year)}
                    </span>
                    <span className="w-32 truncate text-xs text-ink-secondary">
                      {countryName(event.region)}
                    </span>
                    <span className="text-sm" style={{ color: SEVERITY_COLOR[event.severity] }}>
                      {event.headline}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
                Not modelled
              </h3>
              <ul className="mt-4">
                {loaded.expansion.speculative.map((line) => (
                  <li
                    key={line}
                    className="border-b border-rule py-2 text-[11px] leading-relaxed text-ink-muted"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-[10px] text-ink-muted">
                {REGIONS.length} countries · {(loaded.elapsedMs / 1000).toFixed(1)}s to run both
                worlds
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
