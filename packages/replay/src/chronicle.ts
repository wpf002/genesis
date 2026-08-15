// Turning a run into something you can watch.
//
// A tick is a year. The clock starts in 3000 BC, which is roughly where cities,
// writing and states start leaving evidence, and a 5000-tick run reaches the
// present.
//
// Thresholds are taken from each region's own distribution, not from constants.
// The first version of this file used absolute cutoffs picked by eye and every
// one of them was wrong: food ratio sits at 0.72 for the whole run, so "famine
// below 0.9" painted every region amber forever, while legitimacy sits at 1.0
// and fragmentation never passes 0.03, so unrest and fracture never fired at
// all. Percentiles cannot make that mistake — "bad" means bad *for here*, which
// is also what the word means.
//
// None of these names are claims. "Plague" means the infectious compartment went
// into its own top five percent. It is a label on a number, put there so a run
// can be read at a glance instead of squinted at on five axes.

import type { SampleTable } from './world.js';

/** Tick 0. Cities, writing and states are leaving evidence by roughly here. */
export const START_YEAR = -3000;

export function yearOf(tick: number): number {
  return START_YEAR + tick;
}

export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `AD ${year}`;
}

export type Severity = 'good' | 'bad' | 'neutral';

export interface WorldEvent {
  readonly tick: number;
  readonly year: number;
  readonly region: string;
  readonly headline: string;
  readonly detail: string;
  readonly severity: Severity;
}

export interface Condition {
  readonly region: string;
  readonly population: number;
  readonly foodRatio: number;
  readonly infectious: number;
  readonly legitimacy: number;
  /** The single most notable thing happening, which is what the map colours by. */
  readonly state: 'plague' | 'famine' | 'unrest' | 'thriving' | 'steady';
}

export interface Frame {
  readonly tick: number;
  readonly year: number;
  readonly regions: readonly Condition[];
}

const TRACKED = [
  'demography.population',
  'demography.foodRatio',
  'disease_seird.infectious',
  'politics_legitimacy.legitimacy',
  'technology_adoption.adopted',
] as const;

function qualify(region: string, key: string): string {
  return region === '' ? key : `${region}:${key}`;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] as number;
}

interface Band {
  readonly low: number;
  readonly high: number;
}

function bandsFor(table: SampleTable, region: string): Map<string, Band> {
  const bands = new Map<string, Band>();
  for (const key of TRACKED) {
    const values = table.values.get(qualify(region, key));
    if (values === undefined) continue;
    const sorted = [...values].sort((a, b) => a - b);
    bands.set(key, { low: percentile(sorted, 0.05), high: percentile(sorted, 0.95) });
  }
  return bands;
}

/**
 * How much of a population has to be infectious at once before the word applies.
 *
 * This one is absolute where the others are relative, and it has to be. A
 * percentile asks "is this a lot of disease for here", which in a region with
 * almost none still answers yes for the top five percent of almost none — so the
 * first version reported *more* plagues in "the plague never comes" than in the
 * baseline. Disease burden means a share of the population, not a rank.
 */
const PLAGUE_SHARE = 0.02;

function classify(
  foodRatio: number,
  infectious: number,
  legitimacy: number,
  bands: Map<string, Band>,
): Condition['state'] {
  const food = bands.get('demography.foodRatio');
  const rule = bands.get('politics_legitimacy.legitimacy');

  // Worst-thing-first, so the map answers "what is wrong here" in one colour.
  if (infectious >= PLAGUE_SHARE) return 'plague';
  if (food !== undefined && foodRatio <= food.low) return 'famine';
  if (rule !== undefined && legitimacy <= rule.low) return 'unrest';
  if (food !== undefined && foodRatio >= food.high) return 'thriving';
  return 'steady';
}

/**
 * One frame per sampled tick: every region's condition at that moment. This is
 * what a map animates over.
 */
export function conditionFrames(table: SampleTable, points = 200): readonly Frame[] {
  const regions = table.regions;
  const bands = new Map(regions.map((region) => [region, bandsFor(table, region)]));

  const at = (region: string, key: string, index: number): number =>
    table.values.get(qualify(region, key))?.[index] ?? 0;

  const readFrame = (index: number): Frame => {
    const tick = table.ticks[index] ?? 0;
    return {
      tick,
      year: yearOf(tick),
      regions: regions.map((region) => {
        const population = at(region, 'demography.population', index);
        const foodRatio = at(region, 'demography.foodRatio', index);
        const infectious = at(region, 'disease_seird.infectious', index);
        const legitimacy = at(region, 'politics_legitimacy.legitimacy', index);
        return {
          region,
          population,
          foodRatio,
          infectious,
          legitimacy,
          state: classify(foodRatio, infectious, legitimacy, bands.get(region) ?? new Map()),
        };
      }),
    };
  };

  const stride = Math.max(1, Math.ceil(table.ticks.length / points));
  const frames: Frame[] = [];
  for (let i = 0; i < table.ticks.length; i += stride) frames.push(readFrame(i));
  const lastIndex = table.ticks.length - 1;
  if (lastIndex >= 0 && frames[frames.length - 1]?.tick !== table.ticks[lastIndex]) {
    frames.push(readFrame(lastIndex));
  }
  return frames;
}

interface Rule {
  readonly key: string;
  readonly edge: 'high' | 'low';
  readonly headline: string;
  readonly detail: (value: number) => string;
  readonly severity: Severity;
  /** Do not fire again for this many ticks, or a noisy series spams the feed. */
  readonly cooldown: number;
  /** Fixed cutoff instead of this region's own percentile. See PLAGUE_SHARE. */
  readonly absolute?: number;
}

const RULES: readonly Rule[] = [
  {
    key: 'disease_seird.infectious',
    edge: 'high',
    headline: 'Plague spreads',
    detail: (v) => `${(v * 100).toFixed(1)}% of the population infectious`,
    severity: 'bad',
    cooldown: 150,
    absolute: PLAGUE_SHARE,
  },
  {
    key: 'demography.foodRatio',
    edge: 'low',
    headline: 'Famine',
    detail: (v) => `food covers ${(v * 100).toFixed(0)}% of what is needed`,
    severity: 'bad',
    cooldown: 150,
  },
  {
    key: 'politics_legitimacy.legitimacy',
    edge: 'low',
    headline: 'The state loses its grip',
    detail: (v) => `legitimacy down to ${v.toFixed(2)}`,
    severity: 'bad',
    cooldown: 200,
  },
  {
    key: 'demography.foodRatio',
    edge: 'high',
    headline: 'Good harvests',
    detail: (v) => `food at ${(v * 100).toFixed(0)}% of need`,
    severity: 'good',
    cooldown: 300,
  },
];

/** Population collapse is relative to its own peak, so it gets its own pass. */
const COLLAPSE_FRACTION = 0.7;

/**
 * Reads the ledger and names what happened, sorted by tick, so the list reads as
 * a chronicle rather than as a query result.
 */
export function chronicle(table: SampleTable): readonly WorldEvent[] {
  const events: WorldEvent[] = [];

  for (const region of table.regions) {
    const bands = bandsFor(table, region);

    for (const rule of RULES) {
      const values = table.values.get(qualify(region, rule.key));
      const band = bands.get(rule.key);
      if (values === undefined || band === undefined) continue;

      const level = rule.absolute ?? (rule.edge === 'high' ? band.high : band.low);
      // A flat series has low === high and would fire on every tick.
      if (rule.absolute === undefined && band.high === band.low) continue;

      let previous: number | undefined;
      let mutedUntil = -1;
      for (let i = 0; i < values.length; i += 1) {
        const tick = table.ticks[i] as number;
        const value = values[i] as number;
        if (previous !== undefined && tick > mutedUntil) {
          const crossed =
            rule.edge === 'high'
              ? previous <= level && value > level
              : previous >= level && value < level;
          if (crossed) {
            events.push({
              tick,
              year: yearOf(tick),
              region,
              headline: rule.headline,
              detail: rule.detail(value),
              severity: rule.severity,
            });
            mutedUntil = tick + rule.cooldown;
          }
        }
        previous = value;
      }
    }

    // Technology adoption is a genuine S-curve, so the halfway point is a real
    // moment rather than a percentile of noise.
    const adopted = table.values.get(qualify(region, 'technology_adoption.adopted'));
    if (adopted !== undefined) {
      let previous: number | undefined;
      for (let i = 0; i < adopted.length; i += 1) {
        const tick = table.ticks[i] as number;
        const value = adopted[i] as number;
        if (previous !== undefined && previous <= 0.5 && value > 0.5) {
          events.push({
            tick,
            year: yearOf(tick),
            region,
            headline: 'New technology takes hold',
            detail: `half the population has it`,
            severity: 'good',
          });
          break;
        }
        previous = value;
      }
    }

    const population = table.values.get(qualify(region, 'demography.population'));
    if (population !== undefined) {
      let peak = 0;
      let mutedUntil = -1;
      let down = false;
      for (let i = 0; i < population.length; i += 1) {
        const tick = table.ticks[i] as number;
        const value = population[i] as number;
        if (value > peak) peak = value;
        const collapsed = peak > 0 && value < peak * COLLAPSE_FRACTION;
        if (collapsed && !down && tick > mutedUntil) {
          events.push({
            tick,
            year: yearOf(tick),
            region,
            headline: 'Collapse',
            detail: `population down to ${Math.round(value).toLocaleString('en-US')} from ${Math.round(peak).toLocaleString('en-US')}`,
            severity: 'bad',
          });
          mutedUntil = tick + 300;
          down = true;
        }
        if (!collapsed) down = false;
      }
    }
  }

  return events.sort((a, b) => a.tick - b.tick || a.region.localeCompare(b.region));
}
