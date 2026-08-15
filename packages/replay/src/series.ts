// Reading a run out as plottable series.
//
// The ledger already records every write with its tick, so a time series is a
// read, not a second run. Nothing here samples the simulation - it indexes what
// the run already recorded.
//
// This is the one place a Fixed becomes a float, and it is display only. Nothing
// computed here goes back into state, and the exact decimal string is kept
// alongside so a value can still be shown without the rounding.

import { Fx, type Run } from '@genesis/kernel';

export interface Sample {
  readonly tick: number;
  /** Display only. Never fed back into the simulation. */
  readonly value: number;
  readonly exact: string;
}

export interface Series {
  readonly stateKey: string;
  readonly samples: readonly Sample[];
  readonly min: number;
  readonly max: number;
}

/**
 * One series per key, thinned to at most `points` samples so a 5000-tick run
 * draws at the same cost as a 200-tick one. The last tick is always kept: the
 * end of a run is the part nobody wants dropped by a stride.
 */
export function readSeries(
  run: Run,
  keys: readonly string[],
  points = 240,
): readonly Series[] {
  const byKey = new Map<string, Sample[]>();
  for (const key of keys) byKey.set(key, []);

  for (const entry of run.ledger.all()) {
    const bucket = byKey.get(entry.stateKey);
    if (bucket === undefined) continue;
    const exact = Fx.toString(entry.next);
    bucket.push({ tick: entry.tick, value: Number(exact), exact });
  }

  return keys.map((stateKey) => {
    const all = byKey.get(stateKey) ?? [];
    const stride = Math.max(1, Math.ceil(all.length / points));
    const thinned = all.filter((_, index) => index % stride === 0);
    const last = all[all.length - 1];
    if (last !== undefined && thinned[thinned.length - 1]?.tick !== last.tick) {
      thinned.push(last);
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const sample of thinned) {
      if (sample.value < min) min = sample.value;
      if (sample.value > max) max = sample.value;
    }
    if (thinned.length === 0) {
      min = 0;
      max = 0;
    }
    return { stateKey, samples: thinned, min, max };
  });
}

/**
 * The keys worth putting on screen, in reading order: what is grown, who eats
 * it, what it costs, what kills them, who rules, what they know.
 */
export const HEADLINE_KEYS: readonly string[] = [
  'agriculture.yieldPerHectare',
  'agriculture.soilQuality',
  'agriculture.storage',
  'irrigation.yieldBonus',
  'demography.population',
  'demography.foodRatio',
  'migration.outflow',
  'economy.surplus',
  'economy.capital',
  'prices.grain',
  'trade.volume',
  'trade_routes.reach',
  'disease_seird.infectious',
  'disease_seird.dead',
  'politics_legitimacy.legitimacy',
  'politics_elites.fragmentation',
  'conflict_lanchester.strength',
  'culture_transmission.churn',
  'technology_diffusion.stock',
  'technology_adoption.adopted',
];

/** Prefixes the headline keys for one region of a spatial run. */
export function headlineKeysFor(region: string): readonly string[] {
  return region === '' ? HEADLINE_KEYS : HEADLINE_KEYS.map((key) => `${region}:${key}`);
}
