// Reality DNA — the shape of a world at one moment.
//
// Sixteen modelled dimensions, each normalised to 0..1 so they can sit on one
// radial axis set. Two worlds overlaid make the structural difference legible
// in a way sixteen line charts do not.
//
// Every dimension here is a real Genesis state variable. There are no composite
// indices and no invented axes: if the model does not carry it, it is not on the
// chart, and the "not modelled" list beside it says so.

import { yearOf } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import { DIMENSIONS } from './dimensions.js';

export interface DnaAxis {
  readonly key: string;
  readonly label: string;
  readonly subsystem: string;
  /** 0..1, normalised by the dimension's scale constant. */
  readonly value: number;
  /** The unnormalised world mean, for the tooltip. */
  readonly raw: number;
}

export interface RealityDna {
  readonly tick: number;
  readonly year: number;
  readonly axes: readonly DnaAxis[];
}

/** World mean of a dimension at one sample index. */
function meanAt(table: SampleTable, key: string, index: number): number {
  if (table.regions.length === 0) return 0;
  let sum = 0;
  for (const region of table.regions) {
    sum += table.values.get(`${region}:${key}`)?.[index] ?? 0;
  }
  return sum / table.regions.length;
}

export function realityDna(table: SampleTable, index: number): RealityDna {
  const safe = Math.max(0, Math.min(index, table.ticks.length - 1));
  const tick = table.ticks[safe] ?? 0;
  return {
    tick,
    year: yearOf(tick),
    axes: DIMENSIONS.map((d) => {
      const raw = meanAt(table, d.key, safe);
      const value = Math.max(0, Math.min(1, raw / (d.bounded ? 1 : d.scale)));
      return { key: d.key, label: d.label, subsystem: d.subsystem, value, raw };
    }),
  };
}

/** The dimensions a reader might expect on this chart and will not find. */
export const DNA_NOT_MODELLED: readonly string[] = [
  'Borders and territory — the model has no spatial adjacency.',
  'Government type, ruling institutions and named leaders.',
  'Which religion or ideology holds, as opposed to how fast belief turns over.',
  'Literacy, health, inequality and quality of life.',
  'Energy, emissions and climate response beyond a yield anomaly.',
];
