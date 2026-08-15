// Reality Distance — a Genesis model index, not a measurement of history.
//
// How far one simulated world has moved from another, per year, as a single
// number between 0 and 1. It exists because "population is 4% higher" answers a
// narrow question and "how different is this world" does not otherwise have an
// answer at all.
//
// WHAT IT IS NOT. It is not a probability, not a distance in any metric space
// anybody agreed on, and not a claim about how different two real histories
// would have been. It compares two runs of one model to each other.
//
// Every weight in it is INVENTED and registered as such, so `pnpm gate` can walk
// them like any other parameter and the interface can show where they came from
// (nowhere: somebody chose them). The per-dimension scales are equally invented.
//
// The formula, in full:
//
//   for each dimension d and region r at year t
//     nd = |alt - base| / scale(d)                  bounded dims use scale 1
//     clamped to [0, 1]
//   region distance   = Σ w(d)·nd / Σ w(d)
//   world distance(t) = mean over regions
//
// Which is a weighted mean absolute normalised difference. It is deliberately
// not a Euclidean norm: squaring lets one dimension with a bad scale constant
// dominate, and the scale constants are guesses.

import { SandboxParams } from '@genesis/models';
import { yearOf } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import { DIMENSIONS, type Dimension } from './dimensions.js';

/** Maps a dimension's subsystem onto its registered weight parameter. */
const WEIGHT_PARAM: Record<string, string> = {
  demography: 'distance.weight.population',
  agriculture: 'distance.weight.agriculture',
  irrigation: 'distance.weight.agriculture',
  economy: 'distance.weight.economy',
  trade: 'distance.weight.trade',
  'trade routes': 'distance.weight.trade',
  prices: 'distance.weight.prices',
  disease: 'distance.weight.disease',
  migration: 'distance.weight.migration',
  conflict: 'distance.weight.conflict',
  politics: 'distance.weight.politics',
  culture: 'distance.weight.culture',
  technology: 'distance.weight.technology',
};

export interface WeightRow {
  readonly dimension: string;
  readonly subsystem: string;
  readonly param: string;
  readonly weight: number;
  readonly scale: number;
  /** Always INVENTED. Stated rather than assumed. */
  readonly provenance: string;
}

/** The weighting, readable so the interface can show its own arithmetic. */
export function weightTable(): readonly WeightRow[] {
  const params = new SandboxParams();
  return DIMENSIONS.map((d) => {
    const param = WEIGHT_PARAM[d.subsystem] ?? 'distance.weight.culture';
    return {
      dimension: d.label,
      subsystem: d.subsystem,
      param,
      weight: Number(params.get(param).toString()) / 1_000_000,
      scale: d.scale,
      provenance: 'INVENTED',
    };
  });
}

function weightsByKey(): Map<string, number> {
  const params = new SandboxParams();
  const out = new Map<string, number>();
  for (const d of DIMENSIONS) {
    const param = WEIGHT_PARAM[d.subsystem] ?? 'distance.weight.culture';
    out.set(d.key, Number(params.get(param).toString()) / 1_000_000);
  }
  return out;
}

export interface DistancePoint {
  readonly tick: number;
  readonly year: number;
  readonly distance: number;
  /** Distance contributed by each subsystem, so the chart can be broken down. */
  readonly bySubsystem: Readonly<Record<string, number>>;
}

const at = (table: SampleTable, region: string, key: string, i: number): number =>
  table.values.get(`${region}:${key}`)?.[i] ?? 0;

function normalised(d: Dimension, a: number, b: number): number {
  const raw = Math.abs(a - b) / (d.bounded ? 1 : d.scale);
  return raw > 1 ? 1 : raw;
}

/**
 * The series. Both tables must come from the same region set and the same
 * sampling stride, which they do when they come from the same request.
 */
export function realityDistance(
  alternate: SampleTable,
  baseline: SampleTable,
): readonly DistancePoint[] {
  const weights = weightsByKey();
  const regions = alternate.regions;
  const n = Math.min(alternate.ticks.length, baseline.ticks.length);

  let weightTotal = 0;
  for (const d of DIMENSIONS) weightTotal += weights.get(d.key) ?? 0;
  if (weightTotal === 0) weightTotal = 1;

  const points: DistancePoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const bySubsystem: Record<string, number> = {};
    let worldSum = 0;

    for (const region of regions) {
      let regionSum = 0;
      for (const d of DIMENSIONS) {
        const w = weights.get(d.key) ?? 0;
        if (w === 0) continue;
        const contribution =
          w * normalised(d, at(alternate, region, d.key, i), at(baseline, region, d.key, i));
        regionSum += contribution;
        bySubsystem[d.subsystem] = (bySubsystem[d.subsystem] ?? 0) + contribution;
      }
      worldSum += regionSum / weightTotal;
    }

    const divisor = Math.max(1, regions.length);
    for (const key of Object.keys(bySubsystem)) {
      bySubsystem[key] = (bySubsystem[key] as number) / (weightTotal * divisor);
    }

    const tick = alternate.ticks[i] as number;
    points.push({
      tick,
      year: yearOf(tick),
      distance: worldSum / divisor,
      bySubsystem,
    });
  }
  return points;
}

/** Plain-language description of the index, for the "how is this calculated" panel. */
export const DISTANCE_METHOD = {
  name: 'Genesis Reality Distance',
  summary:
    'A weighted mean absolute normalised difference between two runs of this model, per year, across 16 dimensions and every simulated country.',
  formula:
    'nd = min(1, |alt − base| / scale);  region = Σ w·nd / Σ w;  world = mean over regions',
  caveats: [
    'This is a model index. It compares two runs of Genesis to each other and says nothing about how different two real histories would have been.',
    'Every weight is INVENTED and registered as such. So is every per-dimension scale constant.',
    'Mean absolute rather than Euclidean on purpose: squaring lets one dimension with a badly chosen scale constant dominate, and the scale constants are guesses.',
    'A distance of 0 means the two runs agree on every sampled dimension, not that the worlds are the same.',
  ],
} as const;
