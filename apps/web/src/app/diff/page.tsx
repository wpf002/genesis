'use client';

import { useMemo, useState } from 'react';
import { Fx, Run, type Fixed } from '@genesis/kernel';
import { sandboxModules } from '@genesis/models';
import { ModeBadge } from '@/components/ModeBadge';

// Two runs, one seed apart. Both execute here, so the divergence shown is the
// divergence, not a stored summary of one.

const TICKS = 400;

interface Split {
  key: string;
  tick: number;
  left: Fixed;
  right: Fixed;
}

function diff(leftSeed: bigint, rightSeed: bigint) {
  const left = new Run({ seed: leftSeed, modules: sandboxModules() });
  const right = new Run({ seed: rightSeed, modules: sandboxModules() });
  left.advanceTo(TICKS);
  right.advanceTo(TICKS);

  // First tick at which each key stops agreeing.
  const first = new Map<string, Split>();
  const index = (run: Run) => {
    const map = new Map<string, Map<number, Fixed>>();
    for (const entry of run.ledger.all()) {
      const perKey = map.get(entry.stateKey) ?? new Map<number, Fixed>();
      perKey.set(entry.tick, entry.next);
      map.set(entry.stateKey, perKey);
    }
    return map;
  };
  const l = index(left);
  const r = index(right);

  for (const [key, leftTicks] of l) {
    const rightTicks = r.get(key);
    if (rightTicks === undefined) continue;
    for (const [tick, leftValue] of leftTicks) {
      const rightValue = rightTicks.get(tick);
      if (rightValue === undefined) continue;
      if (Fx.cmp(leftValue, rightValue) !== 0) {
        first.set(key, { key, tick, left: leftValue, right: rightValue });
        break;
      }
    }
  }

  return {
    splits: [...first.values()].sort((a, b) => a.tick - b.tick),
    leftHash: left.stateHash(),
    rightHash: right.stateHash(),
    identical: left.stateHash() === right.stateHash(),
  };
}

export default function Diff() {
  const [rightSeed, setRightSeed] = useState('20260807');
  const leftSeed = '20260806';

  const result = useMemo(() => {
    try {
      return diff(BigInt(leftSeed), BigInt(rightSeed || '0'));
    } catch {
      return null;
    }
  }, [rightSeed]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Run diff</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Where and why two timelines split.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span className="label">Seed A</span>
        <span className="font-mono text-sm text-ink">{leftSeed}</span>
        <label className="label" htmlFor="seed-b">
          Seed B
        </label>
        <input
          id="seed-b"
          value={rightSeed}
          onChange={(e) => setRightSeed(e.target.value.replace(/\D/g, ''))}
          className="w-40 rounded border border-rule bg-surface px-2 py-1 font-mono text-sm text-ink"
        />
      </div>

      {result === null ? (
        <p className="mt-8 text-sm text-ink-muted">Enter a seed.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-1">
            <p className="label break-all">A {result.leftHash}</p>
            <p className="label break-all">B {result.rightHash}</p>
          </div>

          {result.identical ? (
            <p
              className="mt-8 rounded border-l-2 bg-surface p-4 text-sm text-ink"
              style={{ borderColor: 'var(--prov-calibrated)' }}
            >
              Same seed, same terminal hash. Nothing split.
            </p>
          ) : (
            <>
              <p className="label mt-8">
                {result.splits.length} of the run&rsquo;s state keys diverge
              </p>
              <ol className="mt-4">
                {result.splits.map((split) => (
                  <li
                    key={split.key}
                    className="grid grid-cols-[4rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-rule py-3 sm:grid-cols-[4rem_16rem_1fr_1fr]"
                  >
                    <span className="font-mono text-xs tabular-nums text-ink">
                      {split.tick}
                    </span>
                    <span className="truncate font-mono text-xs text-ink-secondary">
                      {split.key}
                    </span>
                    <span className="col-start-2 font-mono text-xs tabular-nums text-ink-muted sm:col-start-3">
                      A {Fx.toString(split.left)}
                    </span>
                    <span className="col-start-2 font-mono text-xs tabular-nums text-ink-muted sm:col-start-4">
                      B {Fx.toString(split.right)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      <p className="label mt-8">Genesis does not claim Sandbox output means anything.</p>
    </main>
  );
}
