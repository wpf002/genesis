// Authored Sandbox packs.
//
// Every one of these is Sandbox, which means every number behind it is INVENTED
// and the output is watermarked. They exist to give the engine something to be
// pointed at, and to make the parts that took the longest to get right - soil,
// elites, plague seeding - reachable in one click instead of a paragraph of
// instructions.
//
// A pack is just a Scenario, so anything here can be edited into a permalink and
// sent on.

import { parseScenario, SCENARIO_FORMAT, type Scenario } from './scenario.js';

const packs: readonly unknown[] = [
  {
    format: SCENARIO_FORMAT,
    id: 'baseline',
    title: 'Baseline',
    note: 'Nothing overridden, nothing intervened. Every other pack is a diff against this one.',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 1200,
  },
  {
    format: SCENARIO_FORMAT,
    id: 'soil-exhaustion',
    title: 'Soil exhaustion',
    note: 'Depletion up eightfold, regeneration cut to almost nothing. Soil quality slides into its floor and stays there, and the yield never comes back.',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 1200,
    overrides: {
      'agriculture.soil.depletion_rate': '0.016',
      'agriculture.soil.regeneration_rate': '0.001',
    },
  },
  {
    format: SCENARIO_FORMAT,
    id: 'four-hundred-billion',
    title: 'The 400 billion run',
    note: 'famine_elasticity back at 1.5, the value that let a 5000-year run breed 400 billion people while they starved. Kept as a pack because a bug you can re-run beats a bug you wrote down.',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 1200,
    overrides: {
      'demography.mortality.famine_elasticity': '1.5',
    },
  },
  {
    format: SCENARIO_FORMAT,
    id: 'elite-overproduction',
    title: 'Elite overproduction',
    note: 'Elites produced four times as fast and shed at the same rate as before. The ratio walks past the threshold and does not come back; fragmentation follows it.',
    mode: 'SANDBOX',
    seed: '7',
    ticks: 1200,
    overrides: {
      'politics.elite.production_rate': '0.0036',
    },
  },
  {
    format: SCENARIO_FORMAT,
    id: 'canal-state',
    title: 'Canal state',
    note: 'Triple the surplus going into irrigation and halve the rate canals silt up. Capital and the yield bonus climb before anything downstream moves.',
    mode: 'SANDBOX',
    seed: '7',
    ticks: 1200,
    overrides: {
      'agriculture.irrigation.build_share': '0.15',
      'agriculture.irrigation.capital_decay': '0.01',
    },
  },
  {
    format: SCENARIO_FORMAT,
    id: 'plague-arrival',
    title: 'Plague arrives',
    note: 'One intervention: five percent of the region infectious at tick 300, nothing else touched. Everything that moves after it is attributable to it.',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 1200,
    interventions: [
      {
        tick: 300,
        stateKey: 'disease_seird.infectious',
        value: '0.05',
        rationale: 'A caravan arrives infected. Seeds the compartment directly rather than through import pressure, which disease_spatial recomputes every tick and would erase.',
      },
    ],
  },
  {
    format: SCENARIO_FORMAT,
    id: 'closed-roads',
    title: 'Closed roads',
    note: 'Risk premium doubled and upkeep weight raised. Routes stop paying for themselves and reach falls back to the floor.',
    mode: 'SANDBOX',
    seed: '13',
    ticks: 1200,
    overrides: {
      'trade.route.risk_premium': '0.6',
      'trade.route.upkeep_weight': '0.6',
    },
  },
  {
    format: SCENARIO_FORMAT,
    id: 'six-regions',
    title: 'Six regions',
    note: 'The world run. Egypt, China, Italy, India, France and Turkey, each with its own eighteen subsystems on its own RNG substream. Shorter than the others because it is six times the work per tick.',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 800,
    regions: ['EGY', 'CHN', 'ITA', 'IND', 'FRA', 'TUR'],
  },
];

/** Parsed at module load, so a malformed pack fails the build and not a request. */
export const SCENARIO_PACKS: readonly Scenario[] = packs.map((pack) => parseScenario(pack));

export function packById(id: string): Scenario | undefined {
  return SCENARIO_PACKS.find((pack) => pack.id === id);
}
