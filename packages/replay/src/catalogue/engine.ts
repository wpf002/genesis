// The scenario engine: a counterfactual with a date on it.
//
// A parameter override applied to the whole run is not a counterfactual, it is a
// different universe. "The Black Death never occurs" has to leave 3000 BC to
// 1346 completely untouched and diverge from 1347, or the two timelines were
// never the same timeline and nothing downstream is attributable.
//
// So the run is done in two halves: baseline parameters up to the divergence
// year, snapshot, then the lever's parameters from there on with the same module
// ids and the same RNG substreams, restored from that snapshot. The shocks land
// at the divergence tick. Everything before it is byte-identical to the world
// that actually happened, and `divergenceIsClean` asserts exactly that.

import { Fx, Run, type RunOptions } from '@genesis/kernel';
import { SandboxParams, worldModules, ALL_REGIONS } from '@genesis/models';
import { START_YEAR } from '../chronicle.js';
import { sampleWorld, type SampleTable } from '../world.js';
import type { CatalogueEntry } from './entries.js';

/** 3000 BC to AD 2100. */
export const SPAN_TICKS = 5100;
export const LAST_OBSERVED_YEAR = 2025;

export const tickOfYear = (year: number): number => year - START_YEAR;

export interface CounterfactualRequest {
  readonly entry: CatalogueEntry;
  readonly seed?: bigint;
  readonly regions?: readonly string[];
  readonly ticks?: number;
  readonly every?: number;
  readonly onProgress?: (fraction: number) => void;
}

export interface CounterfactualRun {
  readonly table: SampleTable;
  readonly terminalHash: string;
  readonly divergenceTick: number;
  /** The countries the lever was actually applied to. */
  readonly touched: readonly string[];
}

function optionsFor(
  params: SandboxParams,
  seed: bigint,
  regions: readonly string[],
): RunOptions {
  return { seed, modules: worldModules(params, regions), ledger: 'none' };
}

/**
 * Runs the counterfactual. Sampling happens inline so a 5100-tick world run does
 * not have to be held in a ledger.
 */
export function runCounterfactual(request: CounterfactualRequest): CounterfactualRun {
  const {
    entry,
    seed = 1n,
    regions = ALL_REGIONS,
    ticks = SPAN_TICKS,
    every = 12,
    onProgress,
  } = request;

  const divergenceTick = Math.max(1, Math.min(tickOfYear(entry.year), ticks - 1));

  // A lever with no regions listed is civilization-wide: it lands everywhere.
  const touched = entry.regions.length === 0 ? regions : entry.regions.filter((r) => regions.includes(r));

  const before = new SandboxParams();
  const after = new SandboxParams(entry.lever.overrides);

  // Half one: the world as it was, up to the year it stops being that.
  const run = new Run(optionsFor(before, seed, regions));
  const keys: string[] = [];
  for (const region of regions) {
    for (const key of SAMPLE_KEYS) keys.push(`${region}:${key}`);
  }

  const sampledTicks: number[] = [];
  const columns = new Map<string, number[]>(keys.map((key) => [key, []]));
  const capture = (tick: number, source: Run) => {
    sampledTicks.push(tick);
    for (const key of keys) {
      (columns.get(key) as number[]).push(Number(Fx.toString(source.get(key))));
    }
  };

  const report = Math.max(1, Math.floor(ticks / 80));
  for (let tick = 1; tick <= divergenceTick; tick += 1) {
    run.step();
    if (tick % every === 0) capture(tick, run);
    if (tick % report === 0) onProgress?.(tick / ticks);
  }

  // The switch. Same module ids and the same substreams, so restoring is exact.
  const branched = new Run(optionsFor(after, seed, regions));
  branched.restore(run.snapshot());

  // The shocks land here, on the year of divergence and nowhere else.
  for (const region of touched) {
    for (const shock of entry.lever.shocks) {
      const key = `${region}:${shock.key}`;
      const current = branched.get(key);
      const next = Fx.mul(current, Fx.parse(String(shock.factor)));
      if (Fx.cmp(current, next) === 0) continue;
      branched.override(key, next, {
        key: 'counterfactual.shock',
        provenance: 'INVENTED',
        contribution: Fx.sub(next, current),
      });
    }
  }

  for (let tick = divergenceTick + 1; tick <= ticks; tick += 1) {
    branched.step();
    if (tick % every === 0 || tick === ticks) capture(tick, branched);
    if (tick % report === 0) onProgress?.(tick / ticks);
  }
  onProgress?.(1);

  return {
    table: { ticks: sampledTicks, values: columns, regions, lastTick: ticks },
    terminalHash: branched.stateHash(),
    divergenceTick,
    touched,
  };
}

/** The untouched world. Identical for every scenario at the same seed. */
export function runBaseline(
  seed = 1n,
  regions: readonly string[] = ALL_REGIONS,
  ticks = SPAN_TICKS,
  every = 12,
  onProgress?: (fraction: number) => void,
): CounterfactualRun {
  const sampled = sampleWorld({
    options: optionsFor(new SandboxParams(), seed, regions),
    ticks,
    regions,
    every,
    ...(onProgress === undefined ? {} : { onProgress }),
  });
  return {
    table: sampled.table,
    terminalHash: sampled.terminalHash,
    divergenceTick: 0,
    touched: [],
  };
}

const SAMPLE_KEYS = [
  'demography.population',
  'demography.foodRatio',
  'disease_seird.infectious',
  'politics_legitimacy.legitimacy',
  'technology_adoption.adopted',
] as const;
