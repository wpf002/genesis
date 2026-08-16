'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CATALOGUE,
  encodePermalink,
  entryById,
  eventsNear,
  EVIDENCE,
  formatYear,
  NOT_A_PROBABILITY,
  REPRESENTABILITY,
  SUPPORT,
  type CatalogueEntry,
  type Confidence,
  type WorldEvent,
} from '@genesis/replay';
import type { RealityMessage, RealityResult } from '@/lib/reality.worker';
import { ConditionLegend, WorldView, countryName } from '@/components/WorldView';
import { RealityTree } from '@/components/reality/RealityTree';
import {
  DistanceChart,
  EvidenceTag,
  ModelAgainstRecord,
  RealityDnaChart,
  RippleMap,
} from '@/components/reality/Panels';
import { ModeBadge } from '@/components/ModeBadge';

// The Reality Explorer.
//
// One workspace rather than five routes. /what-if stays discovery; this is where
// a scenario is actually explored. It reuses the map, the chronicle and the
// counterfactual engine rather than reimplementing any of them.

const REGIONS = [
  'ITA', 'GRC', 'TUR', 'EGY', 'ESP', 'FRA', 'TUN', 'DEU', 'GBR', 'RUS',
  'CHN', 'IND', 'USA', 'MEX', 'JPN', 'IRN', 'IRQ', 'POL', 'NLD', 'AUT',
  'SYR', 'ISR', 'MNG', 'PER', 'BRA', 'NGA', 'ETH', 'ZAF', 'CAN', 'AUS',
  'KOR', 'VNM', 'IDN', 'PAK', 'SAU', 'UKR', 'SWE', 'NOR', 'PRT', 'HUN',
];
const TICKS = 5100;
const LAST_OBSERVED_YEAR = 2025;

type Mode = 'history' | 'alternate' | 'compare' | 'future';

const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'history', label: 'Actual history' },
  { id: 'alternate', label: 'Alternate' },
  { id: 'compare', label: 'Compare' },
  { id: 'future', label: 'Future' },
];

/** Report tiers from the existing engine mapped onto the evidence taxonomy. */
const TIER: Record<Confidence, Parameters<typeof EvidenceTag>[0]['kind']> = {
  high: 'simulated',
  extrapolation: 'knock-on',
  speculative: 'not-modelled',
};

const SEVERITY: Record<WorldEvent['severity'], string> = {
  bad: '#d55181',
  good: '#199e70',
  neutral: '#3987e5',
};

export default function RealityExplorer() {
  const params = useParams<{ id: string }>();
  const entry = entryById(params.id);

  const [mode, setMode] = useState<Mode>('compare');
  const [loaded, setLoaded] = useState<RealityResult | undefined>();
  const [progress, setProgress] = useState<{ fraction: number; phase: string } | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const worker = useRef<Worker>();

  const start = useCallback((target: CatalogueEntry) => {
    worker.current?.terminate();
    setLoaded(undefined);
    setFailure(undefined);
    setPlaying(false);
    setProgress({ fraction: 0, phase: 'Starting' });

    const next = new Worker(new URL('../../../lib/reality.worker.ts', import.meta.url));
    worker.current = next;
    next.onmessage = (event: MessageEvent<RealityMessage>) => {
      const message = event.data;
      if (message.kind === 'progress') setProgress({ fraction: message.fraction, phase: message.phase });
      else if (message.kind === 'error') {
        setFailure(message.message);
        setProgress(undefined);
      } else {
        setLoaded(message);
        setProgress(undefined);
        const at = message.frames.findIndex((f) => f.tick >= message.divergenceTick);
        setIndex(Math.max(0, at - 6));
        setPlaying(true);
      }
    };
    next.postMessage({ entryId: target.id, regions: REGIONS, ticks: TICKS });
  }, []);

  useEffect(() => {
    if (entry !== undefined) start(entry);
    return () => worker.current?.terminate();
  }, [entry, start]);

  const frameCount = loaded?.frames.length ?? 0;
  const at = Math.min(index, Math.max(frameCount - 1, 0));
  const frame = loaded?.frames[at];
  const baselineFrame = loaded?.baselineFrames[at];
  const year = frame?.year ?? 0;
  const isForecast = year > LAST_OBSERVED_YEAR;
  const diverged = frame !== undefined && loaded !== undefined && frame.tick >= loaded.divergenceTick;

  // Auto-follow divergence: slow down where the model is actually moving, so a
  // five-thousand-year run does not spend most of its runtime on quiet centuries.
  const paceAt = useCallback(
    (i: number): number => {
      if (!autoFollow || loaded === undefined) return 40;
      const here = loaded.distance[i]?.distance ?? 0;
      const prev = loaded.distance[Math.max(0, i - 1)]?.distance ?? 0;
      const rate = Math.abs(here - prev);
      const peak = Math.max(1e-6, ...loaded.distance.map((d) => d.distance));
      return rate / peak > 0.004 ? 190 : 22;
    },
    [autoFollow, loaded],
  );

  useEffect(() => {
    if (!playing || frameCount === 0) return;
    const timer = setTimeout(() => {
      setIndex((current) => {
        if (current + 1 >= frameCount) {
          setPlaying(false);
          return frameCount - 1;
        }
        return current + 1;
      });
    }, paceAt(at));
    return () => clearTimeout(timer);
  }, [playing, frameCount, at, paceAt]);

  const chronicleSoFar = useMemo(() => {
    if (loaded === undefined || frame === undefined) return [];
    return loaded.events.filter((e) => e.tick <= frame.tick).slice(-14).reverse();
  }, [loaded, frame]);

  const analogues = useMemo(() => {
    if (entry === undefined) return [];
    return CATALOGUE.filter(
      (other) => other.id !== entry.id && other.lever.archetype === entry.lever.archetype,
    ).slice(0, 6);
  }, [entry]);

  if (entry === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-ink">
          No scenario called “{params.id}”. <a className="underline" href="/what-if">Back to all 180</a>.
        </p>
      </main>
    );
  }

  const seekToTick = (tick: number) => {
    if (loaded === undefined) return;
    let best = 0;
    loaded.frames.forEach((f, i) => {
      if (f.tick <= tick) best = i;
    });
    setPlaying(false);
    setIndex(best);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <a href="/what-if" className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink">
            ← all 180 scenarios
          </a>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] text-ink">{entry.title}</h1>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">
            {entry.era} · diverges {formatYear(entry.year)} · archetype “{entry.lever.archetype}”
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                m.id === mode ? 'border-ink bg-surface text-ink' : 'border-rule text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
          <ModeBadge mode="SANDBOX" />
        </div>
      </div>

      {/* Premise vs lever — the distinction the whole app rests on */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-rule p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">What if</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{entry.premise}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-mono text-[10px] text-ink-muted">
              SUPPORT: {SUPPORT.plausible ? 'qualitative' : ''}
            </span>
            <EvidenceTag kind="interpretive" />
          </div>
        </div>
        <div className="rounded border p-4" style={{ borderColor: '#3987e5' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: '#3987e5' }}>
            Genesis interpretation
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{entry.lever.reading}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(entry.lever.overrides).map(([key, value]) => (
              <li key={key} className="font-mono text-[11px] text-ink-secondary">
                {key} = <span className="text-ink">{value}</span>{' '}
                <span style={{ color: EVIDENCE['not-modelled'].color }}>INVENTED</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">
            {REPRESENTABILITY.structural} {NOT_A_PROBABILITY}
          </p>
        </div>
      </div>

      {failure !== undefined && (
        <p className="mt-6 rounded border-l-2 bg-surface p-4 text-sm text-ink" style={{ borderColor: '#d55181' }}>
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
              style={{ width: `${Math.max(2, progress.fraction * 100)}%`, background: 'var(--series-1)' }}
            />
          </div>
        </div>
      )}

      {loaded !== undefined && frame !== undefined && (
        <>
          {/* Reality tree */}
          <section className="mt-8">
            <RealityTree
              firstTick={loaded.frames[0]?.tick ?? 1}
              lastTick={loaded.frames[frameCount - 1]?.tick ?? TICKS}
              divergenceTick={loaded.divergenceTick}
              currentTick={frame.tick}
              cascades={loaded.cascades}
              distance={loaded.distance}
              onSeek={seekToTick}
              title={entry.title}
            />
          </section>

          {/* Transport */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
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
            <button
              onClick={() => seekToTick(loaded.divergenceTick)}
              className="rounded border border-rule px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-surface"
            >
              To the split
            </button>
            <button
              onClick={() => {
                const next = loaded.cascades.find((c) => c.tick > frame.tick);
                if (next !== undefined) seekToTick(next.tick);
              }}
              className="rounded border border-rule px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-surface"
            >
              Next cascade
            </button>
            <button
              onClick={() => seekToTick(5026)}
              className="rounded border border-rule px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-surface"
            >
              2026
            </button>
            <label className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
              <input
                type="checkbox"
                checked={autoFollow}
                onChange={(e) => setAutoFollow(e.target.checked)}
              />
              auto-follow divergence
            </label>
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
              className="h-1 min-w-40 flex-1 accent-[var(--series-1)]"
            />
            <span className="w-32 text-right font-mono text-lg tabular-nums text-ink">
              {formatYear(year)}
            </span>
          </div>

          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em]">
            {!diverged ? (
              <span className="text-ink-muted">Before the split — both worlds byte-identical</span>
            ) : isForecast ? (
              <span style={{ color: EVIDENCE.projection.color }}>
                Projection — past AD 2025 nothing checks the model
              </span>
            ) : (
              <span style={{ color: '#d55181' }}>Diverged {formatYear(entry.year)}</span>
            )}
          </p>

          {/* Maps */}
          {mode !== 'history' && (
            <>
              <div className={`mt-6 grid gap-6 ${mode === 'compare' ? 'lg:grid-cols-2' : ''}`}>
                {mode === 'compare' && baselineFrame !== undefined && (
                  <WorldView
                    title="What happened"
                    subtitle="Genesis baseline"
                    conditions={baselineFrame.regions}
                    forecast={isForecast}
                  />
                )}
                <WorldView
                  title={mode === 'compare' ? 'What if' : entry.title}
                  subtitle={formatYear(year)}
                  conditions={frame.regions}
                  forecast={isForecast}
                />
              </div>
              <div className="mt-3">
                <ConditionLegend />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
                Base geometry is modern Natural Earth polygons. Genesis has no spatial
                adjacency and never moves a border — shading is state, not territory.
              </p>
            </>
          )}

          {/* Actual history mode */}
          {mode === 'history' && (
            <section className="mt-8">
              <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
                Around {formatYear(entry.year)} <EvidenceTag kind="actual-history" />
              </h2>
              <ol className="mt-3">
                {eventsNear(entry.year, 200).map((event) => (
                  <li key={`${event.year}-${event.title}`} className="border-b border-rule py-2.5">
                    <p className="flex flex-wrap items-baseline gap-3">
                      <span className="w-20 font-mono text-xs tabular-nums text-ink-muted">
                        {formatYear(event.year)}
                      </span>
                      <span className="text-sm text-ink">{event.title}</span>
                    </p>
                    <p className="mt-0.5 pl-[5.75rem] text-xs leading-relaxed text-ink-muted">
                      {event.detail}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                Genesis neither reads nor knows about any of these. They are here so the
                divergence year has context, and they are not simulation input — editing
                this list cannot move a state hash.
              </p>
              <div className="mt-8">
                <ModelAgainstRecord fit={loaded.fit} />
              </div>
            </section>
          )}

          {/* Compare / alternate analytics */}
          {(mode === 'compare' || mode === 'alternate') && (
            <>
              <section className="mt-10">
                <DistanceChart
                  series={loaded.distance}
                  divergenceTick={loaded.divergenceTick}
                  currentTick={frame.tick}
                  onSeek={seekToTick}
                />
                {loaded.convergence?.converging === true && (
                  <p className="mt-3 rounded border-l-2 bg-surface p-3 text-xs leading-relaxed text-ink-secondary" style={{ borderColor: EVIDENCE.interpretive.color }}>
                    <span className="font-mono uppercase" style={{ color: EVIDENCE.interpretive.color }}>
                      Model behaviour ·{' '}
                    </span>
                    These worlds are converging. Distance peaked at{' '}
                    {loaded.convergence.peakDistance.toFixed(3)} in{' '}
                    {formatYear(loaded.convergence.peakYear)} and has given back{' '}
                    {(loaded.convergence.recovered * 100).toFixed(0)}% of it. The demographic
                    system is strongly Malthusian: mortality shocks revert toward
                    food-supported carrying capacity, so only levers that move carrying
                    capacity — yield, technology, trade, irrigation — hold a difference to
                    the endpoint.
                  </p>
                )}
              </section>

              {/* Why did these worlds differ */}
              <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
                    Why these worlds differ
                  </h3>
                  <dl className="mt-3">
                    {[
                      ['Divergence', formatYear(entry.year)],
                      ['Parameters changed', loaded.changedParams.join(', ') || 'none'],
                      ['Applied to', `${loaded.touched.length} countries`],
                      [
                        'First difference',
                        loaded.firstDifference === undefined
                          ? 'none — the runs are identical'
                          : `${loaded.firstDifference.label} in ${countryName(loaded.firstDifference.region)}, ${formatYear(loaded.firstDifference.year)}`,
                      ],
                      [
                        'First knock-on country',
                        loaded.arrivals.find((a) => !a.targeted) === undefined
                          ? 'the difference never left the targeted countries'
                          : `${countryName((loaded.arrivals.find((a) => !a.targeted) as { region: string }).region)}, ${formatYear((loaded.arrivals.find((a) => !a.targeted) as { year: number }).year)}`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t border-rule py-2">
                        <dt className="text-[11px] text-ink-muted">{label}</dt>
                        <dd className="mt-0.5 font-mono text-xs text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                    Pre-divergence state is byte-identical and the RNG substreams carry
                    across the branch, so the first difference is caused by the
                    intervention rather than by drift.
                  </p>
                </div>

                <RealityDnaChart
                  labels={loaded.dnaSeries.labels}
                  baseline={loaded.dnaSeries.baseline[at] ?? []}
                  alternate={loaded.dnaSeries.alternate[at] ?? []}
                  year={year}
                />
              </section>

              <section className="mt-10">
                <RippleMap data={loaded.ripple} />
              </section>
            </>
          )}

          {/* Staged report */}
          <section className="mt-12">
            <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
              {mode === 'future' ? 'Through AD 2100' : 'How it plays out'}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loaded.expansion.stages
                .filter((stage) => (mode === 'future' ? stage.year === null || stage.year >= 1900 : true))
                .map((stage) => {
                  const projected = stage.year !== null && stage.year > LAST_OBSERVED_YEAR;
                  return (
                    <div
                      key={stage.title}
                      className="rounded border p-4"
                      style={{ borderColor: projected ? EVIDENCE.projection.color : 'var(--rule)' }}
                    >
                      <p className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
                        <span>{stage.title}</span>
                        {projected && <EvidenceTag kind="projection" />}
                      </p>
                      {stage.year !== null && (
                        <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                          {formatYear(stage.year)}
                        </p>
                      )}
                      <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{stage.summary}</p>
                      <dl className="mt-3">
                        {stage.findings.map((finding) => (
                          <div key={finding.label} className="border-t border-rule py-2">
                            <dt className="flex items-baseline justify-between gap-2">
                              <span className="text-[11px] text-ink-muted">{finding.label}</span>
                              <EvidenceTag kind={projected && finding.confidence === 'high' ? 'projection' : TIER[finding.confidence]} />
                            </dt>
                            <dd className="mt-0.5 font-mono text-xs text-ink">{finding.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Chronicle + not modelled + analogues */}
          <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_18rem]">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">Chronicle</h3>
              <ol className="mt-3 min-h-40">
                {chronicleSoFar.length === 0 && (
                  <li className="py-2 font-mono text-xs text-ink-muted">Nothing yet.</li>
                )}
                {chronicleSoFar.map((event) => (
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
                    <span className="text-sm" style={{ color: SEVERITY[event.severity] }}>
                      {event.headline}
                    </span>
                    <EvidenceTag kind={loaded.touched.includes(event.region) ? 'simulated' : 'knock-on'} />
                  </li>
                ))}
              </ol>

              <h3 className="mt-8 font-mono text-xs uppercase tracking-[0.1em] text-ink">
                Structural analogues
              </h3>
              <p className="mt-1 text-[11px] text-ink-muted">
                Other scenarios running the same “{entry.lever.archetype}” mechanism. Same
                structural change, different history.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {analogues.map((other) => (
                  <li key={other.id}>
                    <a
                      href={`/what-if/${other.id}`}
                      className="inline-block rounded border border-rule px-2.5 py-1 text-[11px] text-ink-secondary hover:bg-surface hover:text-ink"
                    >
                      {other.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">Not modelled</h3>
              <ul className="mt-3">
                {loaded.expansion.speculative.map((line) => (
                  <li key={line} className="border-b border-rule py-2 text-[11px] leading-relaxed text-ink-muted">
                    {line}
                  </li>
                ))}
              </ul>

              <h3 className="mt-8 font-mono text-xs uppercase tracking-[0.1em] text-ink">Run identity</h3>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink-muted">
                This world can be reproduced exactly.
              </p>
              <dl className="mt-2">
                {[
                  ['Seed', '1'],
                  ['Countries', String(REGIONS.length)],
                  ['Baseline hash', loaded.baselineHash.slice(0, 24)],
                  ['Counterfactual hash', loaded.terminalHash.slice(0, 24)],
                ].map(([label, value]) => (
                  <div key={label} className="border-t border-rule py-1.5">
                    <dt className="text-[10px] text-ink-muted">{label}</dt>
                    <dd className="break-all font-mono text-[10px] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={() => {
                  const token = encodePermalink({
                    format: 'genesis-scenario/1',
                    id: entry.id.slice(0, 40),
                    title: entry.title,
                    note: entry.premise,
                    mode: 'SANDBOX',
                    seed: '1',
                    ticks: TICKS,
                    regions: REGIONS,
                    overrides: entry.lever.overrides,
                    interventions: [],
                    phases: [],
                  });
                  void navigator.clipboard?.writeText(token);
                }}
                className="mt-3 w-full rounded border border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-secondary hover:bg-surface hover:text-ink"
              >
                Copy permalink
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
                The permalink carries the parameter set. It does not carry the mode, the
                selected year or the open panel — those change what you are looking at,
                not what was computed.
              </p>
              <p className="mt-3 font-mono text-[10px] text-ink-muted">
                {(loaded.elapsedMs / 1000).toFixed(1)}s to run both worlds
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
