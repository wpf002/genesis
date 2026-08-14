'use client';

import { useMemo, useState } from 'react';
import { Fx, Run, type LedgerEntry } from '@genesis/kernel';
import { sandboxModules } from '@genesis/models';
import { ModeBadge } from '@/components/ModeBadge';
import { ProvenanceTag, type Provenance } from '@/components/ProvenanceTag';

// The kernel runs in the browser: the same modules the determinism check
// replays, so the inspector shows the run rather than a rendering of it.
//
// Copy on this page comes from README.md and ROADMAP.md. Do not paraphrase.

const SEED = 20260806n;
const TICKS = 400;

const COLOR: Record<Provenance, string> = {
  CALIBRATED: 'var(--prov-calibrated)',
  ESTIMATED: 'var(--prov-estimated)',
  INVENTED: 'var(--prov-invented)',
};

function useRun() {
  return useMemo(() => {
    const run = new Run({ seed: SEED, modules: sandboxModules() });
    run.advanceTo(TICKS);
    const entries = run.ledger.all();

    const byTick = new Map<number, LedgerEntry[]>();
    for (const entry of entries) {
      const list = byTick.get(entry.tick);
      if (list === undefined) byTick.set(entry.tick, [entry]);
      else list.push(entry);
    }
    const keys = [...new Set(entries.map((e) => e.stateKey))];
    return { run, entries, byTick, keys, hash: run.stateHash() };
  }, []);
}

export default function Inspector() {
  const { entries, byTick, keys, hash } = useRun();
  const [tick, setTick] = useState(TICKS);
  const [stateKey, setStateKey] = useState<string | null>(null);
  const [factorKey, setFactorKey] = useState<string | null>(null);

  // Click 1: a state value. Click 2: one of its factors. Click 3: a tick where
  // that factor contributed. That is the exit gate, and it is why the panels are
  // laid out left to right in that order.
  const atTick = byTick.get(tick) ?? [];
  const selected = stateKey === null ? null : atTick.find((e) => e.stateKey === stateKey);
  const contributingTicks =
    stateKey === null || factorKey === null
      ? []
      : entries
          .filter((e) => e.stateKey === stateKey && e.factors.some((f) => f.key === factorKey))
          .slice(-40);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
            Provenance inspector
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Click any event and see exactly why it happened.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="label" htmlFor="tick">
          Tick
        </label>
        <input
          id="tick"
          type="range"
          min={1}
          max={TICKS}
          value={tick}
          onChange={(e) => setTick(Number(e.target.value))}
          className="h-1 flex-1 min-w-48 cursor-pointer appearance-none rounded bg-rule accent-[var(--prov-calibrated)]"
        />
        <span className="font-mono text-sm tabular-nums text-ink">{tick}</span>
      </div>
      <p className="label mt-3 break-all">terminal state hash {hash}</p>

      <div className="mt-8 grid gap-px overflow-hidden rounded border border-rule bg-rule lg:grid-cols-3">
        <section className="bg-surface p-5">
          <h2 className="label">1 · State at tick {tick}</h2>
          <ul className="mt-4 flex flex-col gap-1">
            {keys.map((key) => {
              const entry = atTick.find((e) => e.stateKey === key);
              const active = key === stateKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => {
                      setStateKey(key);
                      setFactorKey(null);
                    }}
                    className={`flex w-full items-baseline justify-between gap-3 rounded px-2 py-1 text-left text-xs transition-colors ${
                      active ? 'bg-raised text-ink' : 'text-ink-secondary hover:bg-raised'
                    }`}
                  >
                    <span className="truncate font-mono">{key}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {entry === undefined ? '—' : Fx.toString(entry.next)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-surface p-5">
          <h2 className="label">2 · Why it changed</h2>
          {selected === undefined || selected === null ? (
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Select a state value.
            </p>
          ) : (
            <>
              <p className="mt-4 font-mono text-xs text-ink-secondary">
                {Fx.toString(selected.previous)} → {Fx.toString(selected.next)}
              </p>
              <p className="label mt-1">written by {selected.moduleId}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {selected.factors.map((factor) => (
                  <li key={factor.key}>
                    <button
                      type="button"
                      onClick={() => setFactorKey(factor.key)}
                      className={`w-full rounded border-l-2 px-2 py-1.5 text-left transition-colors ${
                        factor.key === factorKey ? 'bg-raised' : 'hover:bg-raised'
                      }`}
                      style={{ borderColor: COLOR[factor.provenance] }}
                    >
                      <span className="block truncate font-mono text-xs text-ink">
                        {factor.key}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <ProvenanceTag tag={factor.provenance} />
                        <span className="font-mono text-xs tabular-nums text-ink-secondary">
                          {Fx.toString(factor.contribution)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {selected.reads.length > 0 && (
                <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                  <span className="label block pb-1">Read this tick</span>
                  {selected.reads.join(', ')}
                </p>
              )}
            </>
          )}
        </section>

        <section className="bg-surface p-5">
          <h2 className="label">3 · Contributing ticks</h2>
          {factorKey === null ? (
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Select a factor.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1">
              {contributingTicks.map((entry) => (
                <li key={entry.tick}>
                  <button
                    type="button"
                    onClick={() => setTick(entry.tick)}
                    className="flex w-full items-baseline justify-between gap-3 rounded px-2 py-1 text-left font-mono text-xs text-ink-secondary transition-colors hover:bg-raised"
                  >
                    <span className="tabular-nums">{entry.tick}</span>
                    <span className="tabular-nums">{Fx.toString(entry.next)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="label mt-6 max-w-3xl leading-relaxed">
        Genesis does not claim Sandbox output means anything.
      </p>
    </main>
  );
}
