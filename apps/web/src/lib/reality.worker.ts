/// <reference lib="webworker" />
//
// One counterfactual, fully analysed. The baseline is identical for every
// scenario at the same seed and region set, so it is computed once and kept
// across messages — switching scenarios then costs one run, not two.

import {
  butterfly,
  cascades,
  chronicle,
  conditionFrames,
  convergence,
  entryById,
  expand,
  firstDifference,
  modelAgainstRecord,
  realityDistance,
  ripple,
  pressures,
  runBaseline,
  runCounterfactual,
  spread,
  type Butterfly,
  type CascadeEvent,
  type Convergence,
  type DistancePoint,
  type Expansion,
  type FirstDifference,
  type FitPoint,
  type Frame,
  type Pressure,
  type RegionArrival,
  type Ripple,
  type SampleTable,
  type WorldEvent,
} from '@genesis/replay';

export interface RealityRequest {
  readonly entryId: string;
  readonly regions: readonly string[];
  readonly ticks: number;
}

export interface RealityResult {
  readonly kind: 'done';
  readonly frames: readonly Frame[];
  readonly baselineFrames: readonly Frame[];
  readonly events: readonly WorldEvent[];
  readonly expansion: Expansion;
  readonly distance: readonly DistancePoint[];
  readonly cascades: readonly CascadeEvent[];
  readonly convergence: Convergence | undefined;
  readonly firstDifference: FirstDifference | undefined;
  readonly arrivals: readonly RegionArrival[];
  readonly ripple: Ripple;
  readonly butterfly: Butterfly;
  /** World pressures per sampled tick, so the panel needs no re-run. */
  readonly pressureSeries: readonly (readonly Pressure[])[];
  /** Per-region tables kept so a country panel can be opened on any year. */
  readonly regionPressures: Readonly<Record<string, readonly (readonly Pressure[])[]>>;
  readonly fit: readonly FitPoint[];
  readonly divergenceTick: number;
  readonly touched: readonly string[];
  readonly changedParams: readonly string[];
  readonly terminalHash: string;
  readonly baselineHash: string;
  readonly elapsedMs: number;
  /** Sent so the DNA panel can be recomputed on any year without a re-run. */
  readonly dnaSeries: {
    readonly ticks: readonly number[];
    readonly baseline: readonly (readonly number[])[];
    readonly alternate: readonly (readonly number[])[];
    readonly labels: readonly string[];
  };
}

export type RealityMessage =
  | { kind: 'progress'; fraction: number; phase: string }
  | RealityResult
  | { kind: 'error'; message: string };

let cached: { key: string; run: ReturnType<typeof runBaseline> } | undefined;

/** World mean per dimension per sampled tick, small enough to post back. */
function dnaSeries(table: SampleTable, keys: readonly string[]): (readonly number[])[] {
  return table.ticks.map((_, i) =>
    keys.map((key) => {
      if (table.regions.length === 0) return 0;
      let sum = 0;
      for (const region of table.regions) {
        sum += table.values.get(`${region}:${key}`)?.[i] ?? 0;
      }
      return sum / table.regions.length;
    }),
  );
}

function populationAt(table: SampleTable) {
  return (year: number): number | undefined => {
    const tick = year + 3000;
    let best: number | undefined;
    for (let i = 0; i < table.ticks.length; i += 1) {
      if ((table.ticks[i] as number) <= tick) best = i;
      else break;
    }
    if (best === undefined) return undefined;
    let sum = 0;
    for (const region of table.regions) {
      sum += table.values.get(`${region}:demography.population`)?.[best] ?? 0;
    }
    return sum;
  };
}

self.onmessage = async (event: MessageEvent<RealityRequest>) => {
  const started = Date.now();
  const post = (message: RealityMessage) => self.postMessage(message);
  const { entryId, regions, ticks } = event.data;

  try {
    const entry = entryById(entryId);
    if (entry === undefined) throw new Error(`no scenario called ${entryId}`);

    const key = `1|${regions.join(',')}|${ticks}`;
    if (cached?.key !== key) {
      cached = {
        key,
        run: runBaseline(1n, regions, ticks, 12, (f) =>
          post({ kind: 'progress', fraction: f * 0.5, phase: 'Running the world that happened' }),
        ),
      };
    } else {
      post({ kind: 'progress', fraction: 0.5, phase: 'Reusing the world that happened' });
    }
    const base = cached.run;

    const counter = runCounterfactual({
      entry,
      regions,
      ticks,
      every: 12,
      onProgress: (f) =>
        post({ kind: 'progress', fraction: 0.5 + f * 0.45, phase: 'Running the world that did not' }),
    });

    post({ kind: 'progress', fraction: 0.96, phase: 'Comparing the two' });

    const { DIMENSIONS } = await import('@genesis/replay');
    const dimensionKeys = DIMENSIONS.map((d) => d.key);
    const distance = realityDistance(counter.table, base.table);
    const changedParams = Object.keys(entry.lever.overrides);

    post({
      kind: 'done',
      frames: conditionFrames(counter.table),
      baselineFrames: conditionFrames(base.table),
      events: chronicle(counter.table),
      expansion: expand(entry, counter.table, base.table, counter.touched),
      distance,
      cascades: cascades(distance),
      convergence: convergence(distance),
      firstDifference: firstDifference(counter.table, base.table),
      arrivals: spread(counter.table, base.table, counter.touched),
      // The ledger is off at world scale, so this is the coarse trace and says so.
      ripple: ripple(counter.table, base.table, counter.touched, changedParams, false),
      butterfly: butterfly(
        counter.table,
        base.table,
        counter.touched,
        changedParams,
        entry.year,
        entry.lever.reading,
      ),
      // Sampled every eighth frame: enough for the panel to follow the scrubber
      // without shipping sixteen numbers per country per year back.
      pressureSeries: counter.table.ticks.map((_, i) =>
        i % 8 === 0 ? pressures(counter.table, i) : [],
      ),
      regionPressures: Object.fromEntries(
        counter.touched.slice(0, 12).map((region) => [
          region,
          counter.table.ticks.map((_, i) =>
            i % 8 === 0 ? pressures(counter.table, i, region) : [],
          ),
        ]),
      ),
      fit: modelAgainstRecord(populationAt(base.table), populationAt(counter.table), 1000),
      divergenceTick: counter.divergenceTick,
      touched: counter.touched,
      changedParams,
      terminalHash: counter.terminalHash,
      baselineHash: base.terminalHash,
      elapsedMs: Date.now() - started,
      dnaSeries: {
        ticks: counter.table.ticks,
        baseline: dnaSeries(base.table, dimensionKeys),
        alternate: dnaSeries(counter.table, dimensionKeys),
        labels: DIMENSIONS.map((d) => d.label),
      },
    });
  } catch (error) {
    post({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
