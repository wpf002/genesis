// Chronicle entries with both worlds attached.
//
// The chronicle names what happened. That is half an entry: "famine in Italy in
// 1362" is only interesting next to what the untouched world was doing at the
// same moment. This pairs each event with the baseline value, the counterfactual
// value and the difference, so a row answers "and would it have happened
// anyway?" without a second lookup.

import { yearOf } from '../chronicle.js';
import type { WorldEvent } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import { DIMENSIONS } from './dimensions.js';
import type { EvidenceClass } from './evidence.js';

/** Which state variable each headline is about, for the value columns. */
const HEADLINE_KEY: Record<string, string> = {
  'Plague spreads': 'disease_seird.infectious',
  Famine: 'demography.foodRatio',
  'Good harvests': 'demography.foodRatio',
  'The state loses its grip': 'politics_legitimacy.legitimacy',
  'New technology takes hold': 'technology_adoption.adopted',
  Collapse: 'demography.population',
};

export interface ChronicleEntry {
  readonly event: WorldEvent;
  readonly stateKey: string | null;
  readonly label: string | null;
  readonly baseline: number | null;
  readonly counterfactual: number | null;
  readonly delta: number | null;
  /** Simulated where the lever landed, knock-on where it did not. */
  readonly evidence: EvidenceClass;
  /** True when the same event happens in the untouched world too. */
  readonly alsoInBaseline: boolean;
}

function indexOfTick(table: SampleTable, tick: number): number {
  let best = 0;
  for (let i = 0; i < table.ticks.length; i += 1) {
    if ((table.ticks[i] as number) <= tick) best = i;
    else break;
  }
  return best;
}

export function chronicleEntries(
  events: readonly WorldEvent[],
  alternate: SampleTable,
  baseline: SampleTable,
  baselineEvents: readonly WorldEvent[],
  touched: readonly string[],
  projectionFromYear = 2025,
): readonly ChronicleEntry[] {
  const touchedSet = new Set(touched);
  const inBaseline = new Set(
    baselineEvents.map((e) => `${e.tick}:${e.region}:${e.headline}`),
  );

  return events.map((event) => {
    const stateKey = HEADLINE_KEY[event.headline] ?? null;
    const label = DIMENSIONS.find((d) => d.key === stateKey)?.label ?? null;

    let a: number | null = null;
    let b: number | null = null;
    if (stateKey !== null) {
      const ai = indexOfTick(alternate, event.tick);
      const bi = indexOfTick(baseline, event.tick);
      a = alternate.values.get(`${event.region}:${stateKey}`)?.[ai] ?? null;
      b = baseline.values.get(`${event.region}:${stateKey}`)?.[bi] ?? null;
    }

    return {
      event,
      stateKey,
      label,
      baseline: b,
      counterfactual: a,
      delta: a === null || b === null ? null : a - b,
      evidence:
        yearOf(event.tick) > projectionFromYear
          ? 'projection'
          : touchedSet.has(event.region)
            ? 'simulated'
            : 'knock-on',
      alsoInBaseline: inBaseline.has(`${event.tick}:${event.region}:${event.headline}`),
    };
  });
}

/** The last year the engine runs to. Past it there is nothing, and it says so. */
export const SIMULATION_HORIZON_YEAR = 2100;

export function beyondHorizon(year: number): string | null {
  return year > SIMULATION_HORIZON_YEAR
    ? `AD ${year} is outside the current simulation horizon. Genesis runs to AD ${SIMULATION_HORIZON_YEAR} and nothing past it is computed, estimated or extrapolated.`
    : null;
}
