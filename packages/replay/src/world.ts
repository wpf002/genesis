// Running the whole world and sampling it as it goes.
//
// 177 countries over five thousand years is 16 million module-ticks. Reading
// that back out of the factor ledger afterwards costs more memory than a browser
// tab should hold, so this samples the handful of values a map needs while the
// run is happening and never records the ledger at all.
//
// Nothing is left out of the simulation by doing this. Every country, every
// subsystem and every year still runs, and the terminal state hash is identical
// either way — kernel.test.ts pins that. What is skipped is the audit trail of
// which parameter moved which number, which the provenance inspector needs and a
// map does not.

import { Fx, Run, type RunOptions } from '@genesis/kernel';
import { yearOf } from './chronicle.js';
import { DIMENSION_KEYS } from './analysis/dimensions.js';

/**
 * The values a world view is built from. Everything else is left in the run.
 *
 * One list, shared with Reality DNA, Reality Distance and the first-difference
 * search, so those cannot disagree about what a world is made of.
 */
export const SAMPLED_KEYS = DIMENSION_KEYS;

export type SampledKey = string;

/** stateKey -> tick-aligned values. Index i is `ticks[i]` for every key. */
export interface SampleTable {
  readonly ticks: readonly number[];
  readonly values: ReadonlyMap<string, readonly number[]>;
  readonly regions: readonly string[];
  readonly lastTick: number;
}

export interface SampleRequest {
  readonly options: RunOptions;
  readonly ticks: number;
  readonly regions: readonly string[];
  /** Sample every this many ticks. The last tick is always kept. */
  readonly every: number;
  /** Called with 0..1 every few hundred ticks so a long run can show progress. */
  readonly onProgress?: (fraction: number) => void;
}

export interface SampledRun {
  readonly table: SampleTable;
  readonly terminalHash: string;
}

/**
 * Steps the run and records the sampled keys as it goes. The run is stepped one
 * tick at a time rather than in a batch so progress can be reported; the cost of
 * that is nil next to the module work.
 */
export function sampleWorld(request: SampleRequest): SampledRun {
  const { options, ticks, regions, every, onProgress } = request;

  const run = new Run({ ...options, ledger: 'none' });

  const keys: string[] = [];
  for (const region of regions) {
    for (const key of SAMPLED_KEYS) {
      keys.push(region === '' ? key : `${region}:${key}`);
    }
  }

  const sampled: number[] = [];
  const values = new Map<string, number[]>(keys.map((key) => [key, []]));

  const record = (tick: number) => {
    sampled.push(tick);
    for (const key of keys) {
      (values.get(key) as number[]).push(Number(Fx.toString(run.get(key))));
    }
  };

  // Report about a hundred times over the run, whatever its length.
  const reportEvery = Math.max(1, Math.floor(ticks / 100));

  for (let tick = 1; tick <= ticks; tick += 1) {
    run.step();
    if (tick % every === 0 || tick === ticks) record(tick);
    if (onProgress !== undefined && tick % reportEvery === 0) onProgress(tick / ticks);
  }
  onProgress?.(1);

  return {
    table: {
      ticks: sampled,
      values,
      regions,
      lastTick: ticks,
    },
    terminalHash: run.stateHash(),
  };
}

/** The same table shape, read out of a run that did keep its ledger. */
export function tableFromRun(run: Run, regions: readonly string[]): SampleTable {
  const perKey = new Map<string, Map<number, number>>();
  let lastTick = 0;
  for (const entry of run.ledger.all()) {
    const series = perKey.get(entry.stateKey) ?? new Map<number, number>();
    series.set(entry.tick, Number(Fx.toString(entry.next)));
    perKey.set(entry.stateKey, series);
    if (entry.tick > lastTick) lastTick = entry.tick;
  }

  const ticks: number[] = [];
  for (let tick = 1; tick <= lastTick; tick += 1) ticks.push(tick);

  const values = new Map<string, number[]>();
  for (const region of regions) {
    for (const key of SAMPLED_KEYS) {
      const qualified = region === '' ? key : `${region}:${key}`;
      const series = perKey.get(qualified);
      const column: number[] = [];
      let carried = 0;
      for (const tick of ticks) {
        carried = series?.get(tick) ?? carried;
        column.push(carried);
      }
      values.set(qualified, column);
    }
  }

  return { ticks, values, regions, lastTick };
}

/** Where the record stops and the forecast starts. */
export function yearsOf(table: SampleTable): {
  first: number;
  last: number;
  forecastFrom: number | undefined;
} {
  const first = yearOf(table.ticks[0] ?? 1);
  const last = yearOf(table.lastTick);
  return { first, last, forecastFrom: last > 2025 ? 2025 : undefined };
}
