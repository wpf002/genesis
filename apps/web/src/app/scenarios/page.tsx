'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  baselineOf,
  configHash,
  decodePermalink,
  encodePermalink,
  headlineKeysFor,
  publish,
  readSeries,
  runScenario,
  SCENARIO_PACKS,
  verifyPermalink,
  type Scenario,
} from '@genesis/replay';
import { HeroChart, Sparkline, type ChartPair } from '@/components/RunChart';
import { ModeBadge } from '@/components/ModeBadge';

// Everything on this page runs here, in the browser. Nothing is a stored summary:
// if the hash on screen matches the one in the permalink, this machine
// reproduced the run. The charts are read out of the same ledger.

function build(pack: Scenario, region: string) {
  const keys = headlineKeysFor(region);
  const scenario = runScenario(pack);
  const baseline = runScenario(baselineOf(pack));

  const left = readSeries(scenario.run, keys);
  const right = readSeries(baseline.run, keys);

  const pairs: ChartPair[] = keys.map((stateKey, index) => ({
    stateKey,
    scenario: left[index] as ChartPair['scenario'],
    baseline: right[index] as ChartPair['baseline'],
  }));

  return {
    pairs,
    token: encodePermalink(pack),
    configHash: configHash(pack),
    paramSetId: scenario.paramSetId,
    terminalHash: scenario.terminalHash,
    // Same key, same value at every sampled tick, in both runs.
    changed: pairs.filter((pair) =>
      pair.scenario.samples.some(
        (sample, index) => pair.baseline.samples[index]?.exact !== sample.exact,
      ),
    ).length,
  };
}

export default function Scenarios() {
  const [selected, setSelected] = useState(SCENARIO_PACKS[0]?.id ?? '');
  const [region, setRegion] = useState('');
  const [focus, setFocus] = useState('demography.population');
  const [playhead, setPlayhead] = useState(Number.POSITIVE_INFINITY);
  const [playing, setPlaying] = useState(false);
  const [token, setToken] = useState('');

  const pack = SCENARIO_PACKS.find((p) => p.id === selected);
  const activeRegion = pack === undefined ? '' : (pack.regions.includes(region) ? region : (pack.regions[0] ?? ''));

  const view = useMemo(() => {
    if (pack === undefined) return undefined;
    try {
      return build(pack, activeRegion);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [pack, activeRegion]);

  const ticks = pack?.ticks ?? 0;
  const interventionTicks = useMemo(
    () => (pack?.interventions ?? []).map((i) => i.tick),
    [pack],
  );

  // Playback. One rAF loop, wall-clock paced so a 1200-tick run and an 800-tick
  // run take about the same time to watch.
  const frame = useRef<number>();
  useEffect(() => {
    if (!playing) return;
    const perFrame = Math.max(1, Math.ceil(ticks / 240));
    const step = () => {
      setPlayhead((current) => {
        const next = (Number.isFinite(current) ? current : 0) + perFrame;
        if (next >= ticks) {
          setPlaying(false);
          return ticks;
        }
        return next;
      });
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
  }, [playing, ticks]);

  const shown = Math.min(Number.isFinite(playhead) ? playhead : ticks, ticks);

  const focused =
    typeof view === 'object' && view !== undefined
      ? (view.pairs.find((p) => p.stateKey.replace(/^[A-Z]{3}:/, '') === focus) ??
        view.pairs[0])
      : undefined;

  const check = useMemo(() => {
    const trimmed = token.trim();
    if (trimmed === '') return undefined;
    try {
      const scenario = decodePermalink(trimmed);
      return { scenario, ...verifyPermalink(trimmed, publish(scenario).terminalHash) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [token]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Scenarios</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Eight packs. Each one runs against its own untouched baseline, so the
            dashed line is what would have happened if you changed nothing.
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
              setPlayhead(Number.POSITIVE_INFINITY);
              setPlaying(false);
            }}
            className={`rounded border px-3 py-1.5 font-mono text-xs tracking-[0.04em] transition-colors ${
              p.id === selected
                ? 'border-ink bg-surface text-ink'
                : 'border-rule text-ink-secondary hover:bg-surface'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {pack !== undefined && typeof view === 'string' && (
        <p className="mt-8 text-sm text-ink">{view}</p>
      )}

      {pack !== undefined && typeof view === 'object' && view !== undefined && (
        <section className="mt-8">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">{pack.note}</p>

          {pack.regions.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="label">Region</span>
              {pack.regions.map((code) => (
                <button
                  key={code}
                  onClick={() => setRegion(code)}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
                    code === activeRegion
                      ? 'border-ink text-ink'
                      : 'border-rule text-ink-secondary hover:bg-surface'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}

          {/* Transport */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  setPlayhead(0);
                  setPlaying(true);
                }
              }}
              className="rounded border border-rule px-3 py-1.5 font-mono text-xs tracking-[0.08em] text-ink transition-colors hover:bg-surface"
            >
              {playing ? 'Pause' : 'Replay ▶'}
            </button>
            <input
              type="range"
              min={0}
              max={ticks}
              value={shown}
              aria-label="tick"
              onChange={(e) => {
                setPlaying(false);
                setPlayhead(Number(e.target.value));
              }}
              className="h-1 min-w-48 flex-1 accent-[var(--series-1)]"
            />
            <span className="font-mono text-xs tabular-nums text-ink-secondary">
              {shown} / {ticks}
            </span>
          </div>

          {focused !== undefined && (
            <HeroChart
              pair={focused}
              throughTick={shown}
              interventionTicks={interventionTicks}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
              <span className="inline-block h-0.5 w-6" style={{ background: 'var(--series-1)' }} />
              this scenario
            </span>
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
              <span
                className="inline-block h-0 w-6 border-t border-dashed"
                style={{ borderColor: 'var(--ink-muted)' }}
              />
              baseline, nothing touched
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              {view.changed} of {view.pairs.length} headline keys move
            </span>
          </div>

          <p className="label mt-8">Every subsystem, same axis</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {view.pairs.map((pair) => (
              <Sparkline
                key={pair.stateKey}
                pair={pair}
                throughTick={shown}
                interventionTicks={interventionTicks}
                active={pair.stateKey === focused?.stateKey}
                onSelect={() => setFocus(pair.stateKey.replace(/^[A-Z]{3}:/, ''))}
              />
            ))}
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-2 sm:grid-cols-[10rem_1fr]">
            <dt className="label">Seed</dt>
            <dd className="font-mono text-xs tabular-nums text-ink">{pack.seed}</dd>
            <dt className="label">Ticks</dt>
            <dd className="font-mono text-xs tabular-nums text-ink">{pack.ticks}</dd>
            <dt className="label">Config hash</dt>
            <dd className="break-all font-mono text-xs text-ink-secondary">{view.configHash}</dd>
            <dt className="label">Param set</dt>
            <dd className="font-mono text-xs text-ink-secondary">{view.paramSetId}</dd>
            <dt className="label">Terminal hash</dt>
            <dd className="break-all font-mono text-xs text-ink">{view.terminalHash}</dd>
          </dl>

          {Object.keys(pack.overrides).length > 0 && (
            <>
              <p className="label mt-8">Overridden</p>
              <ul className="mt-2">
                {Object.entries(pack.overrides).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-2 font-mono text-xs"
                  >
                    <span className="text-ink-secondary">{key}</span>
                    <span className="tabular-nums text-ink">{value}</span>
                    <span className="label" style={{ color: 'var(--prov-invented)' }}>
                      INVENTED
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {pack.interventions.length > 0 && (
            <>
              <p className="label mt-8">Interventions</p>
              <ul className="mt-2">
                {pack.interventions.map((intervention) => (
                  <li
                    key={`${intervention.tick}:${intervention.stateKey}`}
                    className="border-b border-rule py-3"
                  >
                    <p className="font-mono text-xs text-ink">
                      <span className="tabular-nums">tick {intervention.tick}</span>
                      {'  '}
                      {intervention.stateKey} = {intervention.value}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {intervention.rationale}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="label mt-8">Permalink</p>
          <p className="mt-2 break-all rounded border border-rule bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
            {view.token}
          </p>
        </section>
      )}

      <section className="mt-16 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
          Reproduce a permalink
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Paste one. It runs here and reports whether this machine gets the same hash.
        </p>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
          placeholder="g1...."
          className="mt-4 w-full rounded border border-rule bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink"
        />

        {check !== undefined &&
          ('error' in check ? (
            <p
              className="mt-4 rounded border-l-2 bg-surface p-4 text-sm text-ink"
              style={{ borderColor: 'var(--prov-invented)' }}
            >
              {check.error}
            </p>
          ) : (
            <div
              className="mt-4 rounded border-l-2 bg-surface p-4"
              style={{
                borderColor: check.reproduced
                  ? 'var(--prov-calibrated)'
                  : 'var(--prov-invented)',
              }}
            >
              <p className="text-sm text-ink">
                {check.reproduced
                  ? `Reproduced. ${check.scenario.title}, ${check.scenario.ticks} ticks.`
                  : 'Did not reproduce.'}
              </p>
              {/* Not `label`: it uppercases, and a hash is lowercase hex. */}
              <p className="mt-2 break-all font-mono text-xs text-ink-secondary">
                {check.actual}
              </p>
            </div>
          ))}
      </section>

      <p className="label mt-8">Genesis does not claim Sandbox output means anything.</p>
    </main>
  );
}
