// Historical pressures: why this world is moving the way it is.
//
// A pressure is a modelled quantity read as a force with a direction. Food below
// what a population needs pushes down on that population and outward through
// migration; elites above the positions available push toward fragmentation.
// Both of those are things the model computes, so both are shown; ideology,
// doctrine and environment are not, so they are not.
//
// Magnitude is signed and normalised to roughly -1..1. It is a reading of the
// model's own state, not an index with weights — nothing here is combined with
// anything else, so there is no weighting to justify.

import type { SampleTable } from '../world.js';

export interface Pressure {
  readonly id: string;
  readonly label: string;
  readonly subsystem: string;
  /** -1 to 1. Negative is downward pressure on the system it names. */
  readonly magnitude: number;
  readonly reading: string;
}

const at = (t: SampleTable, region: string, key: string, i: number): number =>
  t.values.get(`${region}:${key}`)?.[i] ?? 0;

function worldMean(table: SampleTable, key: string, index: number): number {
  if (table.regions.length === 0) return 0;
  let sum = 0;
  for (const region of table.regions) sum += at(table, region, key, index);
  return sum / table.regions.length;
}

const clamp = (v: number): number => (v > 1 ? 1 : v < -1 ? -1 : v);

/**
 * The forces on the world at one sampled moment.
 *
 * `region` narrows it to one country; omitted, it is the world mean.
 */
export function pressures(
  table: SampleTable,
  index: number,
  region?: string,
): readonly Pressure[] {
  const safe = Math.max(0, Math.min(index, table.ticks.length - 1));
  const read = (key: string) =>
    region === undefined ? worldMean(table, key, safe) : at(table, region, key, safe);

  const food = read('demography.foodRatio');
  const infectious = read('disease_seird.infectious');
  const legitimacy = read('politics_legitimacy.legitimacy');
  const fragmentation = read('politics_elites.fragmentation');
  const soil = read('agriculture.soilQuality');
  const trade = read('trade_routes.reach');
  const tech = read('technology_adoption.adopted');
  const migration = read('migration.outflow');
  const grain = read('prices.grain');
  const strength = read('conflict_lanchester.strength');

  return [
    {
      id: 'food',
      label: 'Food',
      subsystem: 'demography',
      // 1.0 is exactly enough. Below it the shortfall pushes down on population.
      magnitude: clamp((food - 1) * 2),
      reading:
        food < 1
          ? `Food covers ${(food * 100).toFixed(0)}% of what the population needs. The shortfall raises mortality.`
          : `Food is ${(food * 100).toFixed(0)}% of need. Nothing is pushing down on births.`,
    },
    {
      id: 'disease',
      label: 'Disease',
      subsystem: 'disease',
      magnitude: clamp(-infectious * 20),
      reading: `${(infectious * 100).toFixed(2)}% of the population is infectious.`,
    },
    {
      id: 'legitimacy',
      label: 'State authority',
      subsystem: 'politics',
      magnitude: clamp((legitimacy - 0.5) * 2),
      reading:
        legitimacy < 0.5
          ? `Legitimacy at ${legitimacy.toFixed(2)}. Infrastructure spending is gated on this.`
          : `Legitimacy at ${legitimacy.toFixed(2)}. The state can still build.`,
    },
    {
      id: 'elites',
      label: 'Elite pressure',
      subsystem: 'politics',
      magnitude: clamp(-fragmentation * 8),
      reading: `Fragmentation at ${fragmentation.toFixed(3)}, which throttles trade.`,
    },
    {
      id: 'soil',
      label: 'Soil',
      subsystem: 'agriculture',
      magnitude: clamp((soil - 0.6) * 2.5),
      reading: `Soil quality ${soil.toFixed(2)}. It multiplies yield directly.`,
    },
    {
      id: 'trade',
      label: 'Trade network',
      subsystem: 'trade',
      magnitude: clamp((trade - 0.5) * 2),
      reading: `Route reach ${trade.toFixed(2)}. Imports feed into food stores.`,
    },
    {
      id: 'technology',
      label: 'Technology',
      subsystem: 'technology',
      magnitude: clamp(tech * 2 - 1),
      reading: `${(tech * 100).toFixed(0)}% adoption. It multiplies yield.`,
    },
    {
      id: 'migration',
      label: 'Migration',
      subsystem: 'migration',
      magnitude: clamp(-migration / 200),
      reading: `${Math.round(migration).toLocaleString('en-US')} leaving. Migration is the visible edge of food pressure.`,
    },
    {
      id: 'prices',
      label: 'Grain price',
      subsystem: 'prices',
      magnitude: clamp((2 - grain) / 2),
      reading: `Grain at ${grain.toFixed(2)}. A symptom of scarcity rather than a driver of it.`,
    },
    {
      id: 'conflict',
      label: 'Military draw',
      subsystem: 'conflict',
      magnitude: clamp(-strength / 200),
      reading: `Strength ${Math.round(strength).toLocaleString('en-US')}. Losses are taken out of the population.`,
    },
  ];
}

/** Forces a reader might expect here and will not find, because Genesis has none. */
export const PRESSURES_NOT_MODELLED: readonly string[] = [
  'Religion and ideology as content. The culture subsystem carries a churn rate and two competing traditions, and does not know what either believes.',
  'Geopolitical doctrine, alliances and diplomacy.',
  'Environment beyond a yield anomaly: no climate response, no sea level, no emissions.',
  'Institutions, law and administrative capacity.',
];
