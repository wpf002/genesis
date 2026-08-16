'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ARCHETYPES,
  CATALOGUE,
  EVIDENCE,
  REPRESENTABILITY,
  NOT_A_PROBABILITY,
  SUGGESTION_CAVEAT,
  SUPPORT,
  archetypeById,
  encodePermalink,
  entryById,
  formatYear,
  fork,
  preview,
  suggest,
  type Branch,
  type Phase,
  type Support,
} from '@genesis/replay';
import type { MultiverseMessage, MultiverseResult } from '@/lib/multiverse.worker';
import { WorldView, countryName } from '@/components/WorldView';
import { ModeBadge } from '@/components/ModeBadge';

// Three things in one workbench, because they are one workflow: write a
// divergence, fork it, then compare the worlds that came out.
//
// Nothing here invents a configuration on your behalf. The premise is yours, the
// structural reading is a list you choose from, and the exact parameter changes
// are on screen before anything runs.

const REGION_CHOICES = [
  'ITA', 'GRC', 'TUR', 'EGY', 'ESP', 'FRA', 'TUN', 'DEU', 'GBR', 'RUS',
  'CHN', 'IND', 'USA', 'MEX', 'JPN', 'IRN', 'POL', 'AUT', 'MNG', 'PER',
];
const RUN_REGIONS = REGION_CHOICES;
const TICKS = 5100;
const SUPPORTS: readonly Support[] = [
  'historically-grounded',
  'plausible',
  'speculative',
  'highly-speculative',
];

const SERIES = ['#3987e5', '#199e70', '#c98500', '#d55181', '#9085e9'];

interface Draft {
  premise: string;
  archetypeId: string;
  year: number;
  regions: string[];
  support: Support;
}

function Workbench() {
  const [draft, setDraft] = useState<Draft>({
    premise: '',
    archetypeId: '',
    year: 1500,
    regions: ['ITA', 'FRA'],
    support: 'plausible',
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [result, setResult] = useState<MultiverseResult | undefined>();
  const [progress, setProgress] = useState<{ fraction: number; phase: string } | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [at, setAt] = useState(0);
  const [forkFrom, setForkFrom] = useState<string>('');
  const worker = useRef<Worker>();
  const nextId = useRef(1);
  const search = useSearchParams();

  // Arriving from "fork this reality" preloads that scenario as world one, so
  // the fork is a continuation rather than a retype.
  useEffect(() => {
    const from = search.get('from');
    if (from === null) return;
    const entry = entryById(from);
    if (entry === undefined) return;
    nextId.current = 2;
    setBranches([
      {
        id: 'b1',
        label: entry.title,
        phases: [
          { year: entry.year, regions: entry.regions, lever: entry.lever, label: entry.title },
        ],
      },
    ]);
    setForkFrom('b1');
    setDraft((d) => ({ ...d, year: Math.min(2099, entry.year + 100) }));
  }, [search]);

  const suggestions = useMemo(
    () => (draft.premise.trim().length > 3 ? suggest(draft.premise) : []),
    [draft.premise],
  );
  const shown = useMemo(() => preview(draft), [draft]);

  useEffect(() => () => worker.current?.terminate(), []);

  const phaseFromDraft = (): Phase | undefined => {
    const archetype = archetypeById(draft.archetypeId);
    if (archetype === undefined) return undefined;
    return {
      year: draft.year,
      regions: draft.regions,
      lever: archetype.lever(),
      label: draft.premise.trim() === '' ? archetype.title : draft.premise.trim(),
    };
  };

  const addBranch = () => {
    const phase = phaseFromDraft();
    if (phase === undefined) return;
    setBranches((current) => {
      if (current.length >= 5) return current;
      const parent = current.find((b) => b.id === forkFrom);
      const next =
        parent === undefined
          ? { label: phase.label, phases: [phase] }
          : fork(parent, phase, `${parent.label} → ${phase.label}`);
      // Ids come from a counter, not from length, so removing a world cannot
      // make the next one collide with a survivor.
      return [...current, { ...next, id: `b${nextId.current++}` }];
    });
    setResult(undefined);
  };

  const addFromCatalogue = (id: string) => {
    const entry = entryById(id);
    if (entry === undefined) return;
    setBranches((current) =>
      current.length >= 5
        ? current
        : [
            ...current,
            {
              id: `b${nextId.current++}`,
              label: entry.title,
              phases: [
                { year: entry.year, regions: entry.regions, lever: entry.lever, label: entry.title },
              ],
            },
          ],
    );
    setResult(undefined);
  };

  const run = useCallback(() => {
    if (branches.length === 0) return;
    worker.current?.terminate();
    setResult(undefined);
    setFailure(undefined);
    setProgress({ fraction: 0, phase: 'Starting' });

    const next = new Worker(new URL('../../../lib/multiverse.worker.ts', import.meta.url));
    worker.current = next;
    next.onmessage = (event: MessageEvent<MultiverseMessage>) => {
      const message = event.data;
      if (message.kind === 'progress') setProgress({ fraction: message.fraction, phase: message.phase });
      else if (message.kind === 'error') {
        setFailure(message.message);
        setProgress(undefined);
      } else {
        setResult(message);
        setProgress(undefined);
        setAt(message.ticks.length - 1);
      }
    };
    next.postMessage({ branches, regions: RUN_REGIONS, ticks: TICKS });
  }, [branches]);

  const year = result === undefined ? 0 : (result.ticks[Math.min(at, result.ticks.length - 1)] ?? 0) - 3000;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <a href="/what-if" className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink">
            ← all 180 scenarios
          </a>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] text-ink">
            Build a divergence
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Write your own “what if”, fork it as many times as you like, and run up to
            five worlds against the same baseline.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      {/* 1. Premise */}
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          1 · Your premise
        </h2>
        <input
          value={draft.premise}
          onChange={(e) => setDraft((d) => ({ ...d, premise: e.target.value }))}
          placeholder="What if Napoleon won Waterloo?"
          className="mt-3 w-full rounded border border-rule bg-surface px-3 py-2 text-sm text-ink"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          Genesis does not model Napoleon, Waterloo, armies or treaties. It models
          eighteen structural subsystems, so the next step is choosing which structural
          change stands in for your premise.
        </p>
      </section>

      {/* 2. Structural reading */}
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          2 · Structural reading
        </h2>
        {suggestions.length > 0 && (
          <>
            <p className="mt-2 text-[11px] text-ink-muted">{SUGGESTION_CAVEAT}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s.archetype.id}
                  onClick={() => setDraft((d) => ({ ...d, archetypeId: s.archetype.id }))}
                  className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors hover:bg-surface"
                  style={{ borderColor: '#3987e5', color: '#3987e5' }}
                >
                  {s.archetype.title}
                  <span className="ml-2 text-ink-muted">matched “{s.matched[0]}”</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHETYPES.map((archetype) => (
            <button
              key={archetype.id}
              onClick={() => setDraft((d) => ({ ...d, archetypeId: archetype.id }))}
              className={`rounded border p-3 text-left transition-colors ${
                archetype.id === draft.archetypeId
                  ? 'border-ink bg-surface'
                  : 'border-rule hover:bg-surface'
              }`}
            >
              <span className="text-sm text-ink">{archetype.title}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">
                {archetype.claim}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-ink-muted">
                engine: {archetype.representability}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. When and where */}
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          3 · When and where
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 font-mono text-xs text-ink-secondary">
            Year
            <input
              type="number"
              value={draft.year}
              min={-2999}
              max={2099}
              onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) }))}
              className="w-28 rounded border border-rule bg-surface px-2 py-1 text-ink"
            />
            <span className="text-ink-muted">{formatYear(draft.year)}</span>
          </label>
          <label className="flex items-center gap-2 font-mono text-xs text-ink-secondary">
            Support
            <select
              value={draft.support}
              onChange={(e) => setDraft((d) => ({ ...d, support: e.target.value as Support }))}
              className="rounded border border-rule bg-surface px-2 py-1 text-ink"
            >
              {SUPPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-[11px] text-ink-muted">
          {SUPPORT[draft.support]} {NOT_A_PROBABILITY}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {REGION_CHOICES.map((code) => {
            const on = draft.regions.includes(code);
            return (
              <button
                key={code}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    regions: d.regions.includes(code)
                      ? d.regions.filter((r) => r !== code)
                      : [...d.regions, code],
                  }))
                }
                className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                  on ? 'border-ink text-ink' : 'border-rule text-ink-muted hover:text-ink-secondary'
                }`}
                title={countryName(code)}
              >
                {code}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Exactly what will change */}
      {shown !== undefined && (
        <section className="mt-8 rounded border p-4" style={{ borderColor: '#3987e5' }}>
          <h2 className="font-mono text-xs uppercase tracking-[0.1em]" style={{ color: '#3987e5' }}>
            4 · Exactly what Genesis will change
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{shown.reading}</p>
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {Object.entries(shown.overrides).map(([key, value]) => (
              <li key={key} className="border-b border-rule py-1.5 font-mono text-[11px]">
                <span className="text-ink-secondary">{key}</span> ={' '}
                <span className="text-ink">{value}</span>{' '}
                <span style={{ color: EVIDENCE['not-modelled'].color }}>INVENTED</span>
              </li>
            ))}
            {shown.shocks.map((shock) => (
              <li key={shock.key} className="border-b border-rule py-1.5 font-mono text-[11px]">
                <span className="text-ink-secondary">{shock.key}</span> ×{' '}
                <span className="text-ink">{shock.factor}</span> in {formatYear(draft.year)}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
            {REPRESENTABILITY[shown.archetype.representability]}
          </p>
          <ul className="mt-2">
            {shown.limits.map((limit) => (
              <li key={limit} className="py-1 text-[11px] leading-relaxed text-ink-muted">
                — {limit}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={addBranch}
              className="rounded border border-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface"
            >
              {forkFrom === '' ? 'Add as a world' : 'Fork the selected world'}
            </button>
            <select
              value={forkFrom}
              onChange={(e) => setForkFrom(e.target.value)}
              className="rounded border border-rule bg-surface px-2 py-1.5 font-mono text-[11px] text-ink"
            >
              <option value="">start a new world</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  fork {b.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Worlds */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
            5 · Worlds to run ({branches.length}/5)
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              onChange={(e) => {
                if (e.target.value !== '') addFromCatalogue(e.target.value);
                e.target.value = '';
              }}
              className="rounded border border-rule bg-surface px-2 py-1 font-mono text-[11px] text-ink"
              defaultValue=""
            >
              <option value="">add one of the 180…</option>
              {CATALOGUE.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setBranches([]);
                setResult(undefined);
              }}
              className="rounded border border-rule px-3 py-1 font-mono text-[11px] text-ink-muted hover:text-ink"
            >
              clear
            </button>
            <button
              onClick={run}
              disabled={branches.length === 0}
              className="rounded border border-ink px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface disabled:opacity-40"
            >
              Run {branches.length || ''} {branches.length === 1 ? 'world' : 'worlds'}
            </button>
          </div>
        </div>

        <ol className="mt-3">
          {branches.length === 0 && (
            <li className="py-3 text-sm text-ink-muted">
              Nothing yet. Write a premise above, or drop in one of the 180.
            </li>
          )}
          {branches.map((branch, i) => (
            <li key={branch.id} className="flex flex-wrap items-baseline gap-3 border-b border-rule py-2.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: SERIES[i % SERIES.length] }}
              />
              <span className="text-sm text-ink">{branch.label}</span>
              <span className="font-mono text-[10px] text-ink-muted">
                {branch.phases.map((p) => formatYear(p.year)).join(' → ')} ·{' '}
                {branch.phases.length} {branch.phases.length === 1 ? 'phase' : 'phases'}
              </span>
              <button
                onClick={() => {
                  setBranches((c) => c.filter((b) => b.id !== branch.id));
                  setResult(undefined);
                }}
                className="ml-auto font-mono text-[10px] text-ink-muted hover:text-ink"
              >
                remove
              </button>
            </li>
          ))}
        </ol>
      </section>

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

      {/* Multiverse comparison */}
      {result !== undefined && (
        <section className="mt-12 border-t border-rule pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {result.branches.length} worlds against one baseline
            </h2>
            <span className="w-32 text-right font-mono text-lg tabular-nums text-ink">
              {formatYear(year)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={result.ticks.length - 1}
            value={Math.min(at, result.ticks.length - 1)}
            onChange={(e) => setAt(Number(e.target.value))}
            aria-label="year"
            className="mt-3 h-1 w-full accent-[var(--series-1)]"
          />

          {/* Reality Distance, all branches on one axis */}
          <div className="mt-6">
            <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
              Reality distance from baseline
            </h3>
            <MultiDistance result={result} at={at} />
          </div>

          {/* Ranked outcomes */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="border-b border-rule font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  <th className="py-2">World</th>
                  <th className="py-2">Diverges</th>
                  <th className="py-2">First difference</th>
                  <th className="py-2">Distance now</th>
                  <th className="py-2">Peak</th>
                  <th className="py-2">Converging</th>
                  <th className="py-2">Terminal hash</th>
                </tr>
              </thead>
              <tbody>
                {result.branches.map((branch, i) => {
                  const now = branch.distance[Math.min(at, branch.distance.length - 1)];
                  return (
                    <tr key={branch.id} className="border-b border-rule align-baseline">
                      <td className="py-2 text-sm text-ink">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ background: SERIES[i % SERIES.length] }}
                        />
                        {branch.label}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-ink-secondary">
                        {branch.phaseTicks.map((t) => formatYear(t - 3000)).join(' → ')}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-ink-secondary">
                        {branch.firstDifferenceYear === null
                          ? 'none'
                          : formatYear(branch.firstDifferenceYear)}
                      </td>
                      <td className="py-2 font-mono text-[11px] tabular-nums text-ink">
                        {now?.distance.toFixed(3) ?? '—'}
                      </td>
                      <td className="py-2 font-mono text-[11px] tabular-nums text-ink-muted">
                        {branch.convergence?.peakDistance.toFixed(3) ?? '—'}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-ink-muted">
                        {branch.convergence?.converging === true
                          ? `yes, gave back ${(branch.convergence.recovered * 100).toFixed(0)}%`
                          : 'no'}
                      </td>
                      <td className="py-2 font-mono text-[10px] text-ink-muted">
                        {branch.terminalHash.slice(0, 12)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Small multiples: one map each, kept small on purpose */}
          <h3 className="mt-10 font-mono text-xs uppercase tracking-[0.1em] text-ink">
            Small multiples · {formatYear(year)}
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[result.baseline, ...result.branches].map((branch, i) => {
              const frameIndex = Math.round(
                (Math.min(at, result.ticks.length - 1) / Math.max(1, result.ticks.length - 1)) *
                  (branch.frames.length - 1),
              );
              return (
                <div key={branch.id}>
                  <WorldView
                    title={branch.label}
                    subtitle={i === 0 ? 'nothing touched' : `${branch.phaseTicks.length} phases`}
                    conditions={branch.frames[frameIndex]?.regions ?? []}
                    forecast={year > 2025}
                  />
                </div>
              );
            })}
          </div>

          {/* Reality DNA overlay */}
          <h3 className="mt-10 font-mono text-xs uppercase tracking-[0.1em] text-ink">
            Reality DNA · {formatYear(year)}
          </h3>
          <MultiDna result={result} at={at} />

          <p className="mt-8 font-mono text-[10px] text-ink-muted">
            {RUN_REGIONS.length} countries · {(result.elapsedMs / 1000).toFixed(1)}s for{' '}
            {result.branches.length + 1} worlds · every branch reproducible from its phases
          </p>
          <div className="mt-3">
            {branches.map((branch, i) => (
              <p key={branch.id} className="break-all py-1 font-mono text-[10px] text-ink-muted">
                <span style={{ color: SERIES[i % SERIES.length] }}>{branch.label}</span>{' '}
                {encodePermalink({
                  format: 'genesis-scenario/1',
                  id: `custom-${i + 1}`,
                  title: branch.label,
                  note: draft.premise,
                  mode: 'SANDBOX',
                  seed: '1',
                  ticks: TICKS,
                  regions: RUN_REGIONS,
                  overrides: {},
                  interventions: [],
                  phases: branch.phases.map((p) => ({
                    year: p.year,
                    regions: [...p.regions],
                    overrides: p.lever.overrides,
                    shocks: p.lever.shocks.map((s) => ({ key: s.key, factor: String(s.factor) })),
                    label: p.label,
                    archetype: p.lever.archetype,
                    reading: p.lever.reading,
                  })),
                }).slice(0, 96)}
                …
              </p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function MultiDistance({ result, at }: { result: MultiverseResult; at: number }) {
  const W = 960;
  const H = 170;
  const PAD = 36;
  const ticks = result.ticks;
  const first = ticks[0] ?? 0;
  const last = ticks[ticks.length - 1] ?? 1;
  const peak = Math.max(
    0.001,
    ...result.branches.flatMap((b) => b.distance.map((p) => p.distance)),
  );
  const x = (tick: number) => PAD + ((tick - first) / Math.max(1, last - first)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / peak) * (H - PAD * 1.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD} x2={W - PAD} y1={y(peak * f)} y2={y(peak * f)} stroke="var(--grid)" />
          <text x={4} y={y(peak * f) - 3} fill="var(--ink-muted)" fontSize={9} fontFamily="ui-monospace, monospace">
            {(peak * f).toFixed(2)}
          </text>
        </g>
      ))}
      {result.branches.map((branch, i) => (
        <g key={branch.id}>
          <path
            d={`M${branch.distance.map((p) => `${x(p.tick).toFixed(1)},${y(p.distance).toFixed(1)}`).join('L')}`}
            fill="none"
            stroke={SERIES[i % SERIES.length]}
            strokeWidth={1.75}
          />
          {branch.phaseTicks.map((tick) => (
            <circle key={tick} cx={x(tick)} cy={H - PAD} r={3} fill={SERIES[i % SERIES.length]} />
          ))}
        </g>
      ))}
      <line
        x1={x(ticks[Math.min(at, ticks.length - 1)] ?? first)}
        x2={x(ticks[Math.min(at, ticks.length - 1)] ?? first)}
        y1={10}
        y2={H - PAD}
        stroke="var(--ink)"
        opacity={0.5}
      />
    </svg>
  );
}

function MultiDna({ result, at }: { result: MultiverseResult; at: number }) {
  const size = 320;
  const c = size / 2;
  const r = c - 46;
  const labels = result.labels;
  const n = labels.length;
  const index = Math.min(at, result.ticks.length - 1);

  const point = (i: number, value: number) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const radius = r * Math.max(0.04, Math.min(1, value));
    return [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  };
  const poly = (values: readonly number[]) =>
    values.map((v, i) => point(i, Math.min(1, v)).map((q) => q.toFixed(1)).join(',')).join(' ');

  // Normalise each axis by the largest value any world reaches there, so the
  // shapes are comparable rather than each drawn to its own scale.
  const ceilings = labels.map((_, d) =>
    Math.max(
      1e-9,
      ...[result.baseline, ...result.branches].map((b) => b.dna[index]?.[d] ?? 0),
    ),
  );
  const scaled = (b: { dna: readonly (readonly number[])[] }) =>
    labels.map((_, d) => (b.dna[index]?.[d] ?? 0) / (ceilings[d] as number));

  return (
    <div className="mt-2 flex flex-wrap items-start gap-8">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm" role="img">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={c} cy={c} r={r * f} fill="none" stroke="var(--grid)" />
        ))}
        {labels.map((label, i) => {
          const [px, py] = point(i, 1.16);
          return (
            <text key={label} x={px} y={py} textAnchor="middle" fill="var(--ink-muted)" fontSize={7.5} fontFamily="ui-monospace, monospace">
              {label}
            </text>
          );
        })}
        <polygon
          points={poly(scaled(result.baseline))}
          fill="var(--ink-muted)"
          fillOpacity={0.12}
          stroke="var(--ink-muted)"
          strokeDasharray="3 2"
        />
        {result.branches.map((branch, i) => (
          <polygon
            key={branch.id}
            points={poly(scaled(branch))}
            fill={SERIES[i % SERIES.length]}
            fillOpacity={0.1}
            stroke={SERIES[i % SERIES.length]}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div>
        <p className="font-mono text-[10px] text-ink-muted">
          Each axis is normalised to the largest value any of these worlds reaches
          there, so the shapes compare to each other rather than to an absolute.
        </p>
        <ul className="mt-3">
          <li className="flex items-center gap-2 py-1 font-mono text-[11px] text-ink-muted">
            <span className="inline-block h-0 w-6 border-t border-dashed" style={{ borderColor: 'var(--ink-muted)' }} />
            Baseline
          </li>
          {result.branches.map((branch, i) => (
            <li key={branch.id} className="flex items-center gap-2 py-1 font-mono text-[11px] text-ink-secondary">
              <span className="inline-block h-0.5 w-6" style={{ background: SERIES[i % SERIES.length] }} />
              {branch.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// useSearchParams needs a boundary or the App Router refuses to prerender the
// route. The workbench reads ?from= to preload a scenario when it is reached
// through "fork this reality".
export default function Build() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-6 py-10">
          <p className="font-mono text-xs text-ink-muted">Loading the workbench…</p>
        </main>
      }
    >
      <Workbench />
    </Suspense>
  );
}
