// The divergence timeline: where two runs split, and why.
//
// "Where" is the first tick a state key stops agreeing. "Why" is the factor
// breakdown the branch recorded at that tick, which the ledger already carries -
// so the answer is read out of the run rather than reconstructed after it.

import { Fx, type Factor, type LedgerEntry, type Run } from '@genesis/kernel';

export interface Divergence {
  readonly stateKey: string;
  readonly tick: number;
  readonly parentValue: string;
  readonly branchValue: string;
  /** What the branch attributed the write to at the tick it split. */
  readonly because: readonly Factor[];
  readonly moduleId: string;
}

function index(run: Run): Map<string, Map<number, LedgerEntry>> {
  const map = new Map<string, Map<number, LedgerEntry>>();
  for (const entry of run.ledger.all()) {
    const perKey = map.get(entry.stateKey) ?? new Map<number, LedgerEntry>();
    perKey.set(entry.tick, entry);
    map.set(entry.stateKey, perKey);
  }
  return map;
}

/** Sorted by tick, so the head of the list is the origin of the split. */
export function divergenceTimeline(parent: Run, child: Run): readonly Divergence[] {
  const left = index(parent);
  const right = index(child);
  const out: Divergence[] = [];

  for (const [stateKey, branchTicks] of right) {
    const parentTicks = left.get(stateKey);
    if (parentTicks === undefined) continue;

    const ticks = [...branchTicks.keys()].sort((a, b) => a - b);
    for (const tick of ticks) {
      const branchEntry = branchTicks.get(tick);
      const parentEntry = parentTicks.get(tick);
      if (branchEntry === undefined || parentEntry === undefined) continue;
      if (Fx.cmp(parentEntry.next, branchEntry.next) === 0) continue;

      out.push({
        stateKey,
        tick,
        parentValue: Fx.toString(parentEntry.next),
        branchValue: Fx.toString(branchEntry.next),
        because: branchEntry.factors,
        moduleId: branchEntry.moduleId,
      });
      break;
    }
  }

  return out.sort((a, b) => a.tick - b.tick || a.stateKey.localeCompare(b.stateKey));
}
