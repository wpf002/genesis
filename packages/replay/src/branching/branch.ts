// Branches: a chain of dated divergences, not just one.
//
// The counterfactual engine ran a single split — baseline params to year Y, then
// the lever's params after it. A fork is the same move applied again: run the
// branch as it stands to the fork year, snapshot, switch parameters, continue.
// N phases instead of two.
//
// Everything the single-divergence version guaranteed still holds at every
// phase boundary. Module ids and RNG substreams carry across each switch, so
// state before phase k is byte-identical to the branch without phase k, and any
// difference after it is attributable to that phase and nothing else.
//
// A branch is data. It has no server-side existence: the whole chain travels in
// the permalink, so a fork someone sends you reproduces here exactly.

import { Fx, Run, type RunOptions } from '@genesis/kernel';
import { SandboxParams, worldModules, ALL_REGIONS } from '@genesis/models';
import { START_YEAR } from '../chronicle.js';
import { DIMENSION_KEYS } from '../analysis/dimensions.js';
import type { SampleTable } from '../world.js';
import type { Lever } from '../catalogue/levers.js';

export const SPAN_TICKS = 5100;
export const tickOfYear = (year: number): number => year - START_YEAR;

/** One dated divergence in a chain. */
export interface Phase {
  /** Point of divergence. Negative is BC. */
  readonly year: number;
  /** Countries it lands on. Empty means everywhere in the run. */
  readonly regions: readonly string[];
  readonly lever: Lever;
  /** Human-facing. Not hashed, does not affect the run. */
  readonly label: string;
}

export interface Branch {
  readonly id: string;
  readonly label: string;
  /** Applied in year order. Two phases in one year are refused. */
  readonly phases: readonly Phase[];
}

export class BranchInvalid extends Error {}

export function assertBranchValid(branch: Branch, ticks = SPAN_TICKS): void {
  const years = new Set<number>();
  let previous = Number.NEGATIVE_INFINITY;
  for (const phase of branch.phases) {
    if (years.has(phase.year)) {
      throw new BranchInvalid(`branch: two phases diverge in ${phase.year}`);
    }
    years.add(phase.year);
    if (phase.year < previous) {
      throw new BranchInvalid('branch: phases must be in year order');
    }
    previous = phase.year;
    const tick = tickOfYear(phase.year);
    if (tick < 1 || tick >= ticks) {
      throw new BranchInvalid(
        `branch: ${phase.year} is outside the run (${START_YEAR} to ${START_YEAR + ticks})`,
      );
    }
  }
}

export interface BranchRunRequest {
  readonly branch: Branch;
  readonly seed?: bigint;
  readonly regions?: readonly string[];
  readonly ticks?: number;
  readonly every?: number;
  readonly onProgress?: (fraction: number) => void;
}

export interface BranchRun {
  readonly table: SampleTable;
  readonly terminalHash: string;
  /** Tick of each phase, in order, so the tree can draw every split. */
  readonly phaseTicks: readonly number[];
  /** Countries touched by any phase. */
  readonly touched: readonly string[];
  /** Every parameter any phase changed. */
  readonly changedParams: readonly string[];
}

function optionsFor(
  params: SandboxParams,
  seed: bigint,
  regions: readonly string[],
): RunOptions {
  return { seed, modules: worldModules(params, regions), ledger: 'none' };
}

/**
 * Runs a chain of dated divergences.
 *
 * Later phases compose: a phase's overrides are merged onto everything set by
 * the phases before it, so "expand trade" after "empire endures" keeps the
 * empire. A later phase setting the same key wins, which is what forking to
 * change your mind should do.
 */
export function runBranch(request: BranchRunRequest): BranchRun {
  const {
    branch,
    seed = 1n,
    regions = ALL_REGIONS,
    ticks = SPAN_TICKS,
    every = 12,
    onProgress,
  } = request;

  assertBranchValid(branch, ticks);

  const keys: string[] = [];
  for (const region of regions) {
    for (const key of DIMENSION_KEYS) keys.push(`${region}:${key}`);
  }
  const sampledTicks: number[] = [];
  const columns = new Map<string, number[]>(keys.map((key) => [key, []]));

  let current = new Run(optionsFor(new SandboxParams(), seed, regions));
  const capture = (tick: number) => {
    sampledTicks.push(tick);
    for (const key of keys) {
      (columns.get(key) as number[]).push(Number(Fx.toString(current.get(key))));
    }
  };

  const report = Math.max(1, Math.floor(ticks / 80));
  const phaseTicks: number[] = [];
  const touched = new Set<string>();
  const merged: Record<string, string> = {};

  let tick = 0;
  for (const phase of branch.phases) {
    const target = tickOfYear(phase.year);
    while (tick < target) {
      tick += 1;
      current.step();
      if (tick % every === 0) capture(tick);
      if (tick % report === 0) onProgress?.(tick / ticks);
    }

    // The switch. Same module ids and substreams, so restoring is exact.
    Object.assign(merged, phase.lever.overrides);
    const next = new Run(optionsFor(new SandboxParams(merged), seed, regions));
    next.restore(current.snapshot());
    current = next;

    const landing =
      phase.regions.length === 0 ? regions : phase.regions.filter((r) => regions.includes(r));
    for (const region of landing) touched.add(region);

    for (const region of landing) {
      for (const shock of phase.lever.shocks) {
        const key = `${region}:${shock.key}`;
        const before = current.get(key);
        const after = Fx.mul(before, Fx.parse(String(shock.factor)));
        if (Fx.cmp(before, after) === 0) continue;
        current.override(key, after, {
          key: 'branch.shock',
          provenance: 'INVENTED',
          contribution: Fx.sub(after, before),
        });
      }
    }
    phaseTicks.push(target);
  }

  while (tick < ticks) {
    tick += 1;
    current.step();
    if (tick % every === 0 || tick === ticks) capture(tick);
    if (tick % report === 0) onProgress?.(tick / ticks);
  }
  onProgress?.(1);

  return {
    table: { ticks: sampledTicks, values: columns, regions, lastTick: ticks },
    terminalHash: current.stateHash(),
    phaseTicks,
    touched: [...touched],
    changedParams: Object.keys(merged).sort(),
  };
}

/** Adds a phase, keeping year order. Returns a new branch; nothing is mutated. */
export function fork(branch: Branch, phase: Phase, label: string): Branch {
  const phases = [...branch.phases, phase].sort((a, b) => a.year - b.year);
  return {
    id: `${branch.id}+${phase.year}`,
    label,
    phases,
  };
}
