// How a historical counterfactual becomes something the kernel can run.
//
// Genesis simulates eighteen abstract subsystems per country. It has never heard
// of Alexander, Gaugamela or the Confederacy, and it never will. What it can do
// is take a *structural reading* of a counterfactual — a dated year, the
// countries involved, and the parameter changes and shocks that express it — and
// run that.
//
// "The Black Death never occurs" reads as: disease transmission across Europe,
// cut hard, from 1347. That is not the Black Death. It is the shape of the Black
// Death in the only vocabulary this engine has, and the interface says so.
//
// Most of the 180 scenarios collapse into the archetypes below. Sharing them is
// deliberate: two scenarios that make the same structural claim should produce
// the same structural change, and it should be obvious when they do.

/** A shock applied to a state key at the year of divergence. */
export interface Shock {
  /** Unqualified key, e.g. "demography.population". Prefixed per region. */
  readonly key: string;
  /** Multiplier on whatever the value is at that moment. */
  readonly factor: number;
  readonly rationale: string;
}

export interface Lever {
  readonly archetype: string;
  /** Registered Sandbox parameters, changed for the whole run. */
  readonly overrides: Readonly<Record<string, string>>;
  readonly shocks: readonly Shock[];
  /** One line on what the structural reading actually is. */
  readonly reading: string;
}

const none: Readonly<Record<string, string>> = {};

/** An empire holds together: legitimacy restored faster, elites shed faster. */
export const empireEndures = (): Lever => ({
  archetype: 'empire endures',
  overrides: {
    'politics.legitimacy.restoration_rate': '0.12',
    'politics.legitimacy.decay': '0.015',
    'politics.state.fragmentation_pressure': '0.25',
    // A state that survives keeps its roads open and its canals dug. Without
    // these, the lever moved population by 0.0%: the model returns population to
    // whatever the food supply carries, so a counterfactual that does not touch
    // carrying capacity does not survive to the terminal year.
    'trade.route.risk_premium': '0.1',
    'trade.port.throughput_cap': '150000',
    'agriculture.irrigation.build_share': '0.14',
    'agriculture.irrigation.capital_decay': '0.012',
  },
  shocks: [],
  reading:
    'The state holds, and keeps working: legitimacy recovers faster and decays slower, fragmentation pressure quartered, roads safer, ports wider and three times the surplus going into canals.',
});

/** An empire comes apart: legitimacy collapses and the roads stop paying. */
export const empireBreaks = (): Lever => ({
  archetype: 'empire breaks',
  overrides: {
    'politics.legitimacy.decay': '0.06',
    'politics.legitimacy.restoration_rate': '0.03',
    'politics.state.fragmentation_pressure': '0.9',
    // The roads and the canals go with it.
    'trade.route.risk_premium': '0.7',
    'trade.port.throughput_cap': '12000',
    'agriculture.irrigation.build_share': '0.012',
    'agriculture.irrigation.capital_decay': '0.05',
  },
  shocks: [
    {
      key: 'politics_legitimacy.legitimacy',
      factor: 0.35,
      rationale: 'The authority that held it together is gone at the point of divergence.',
    },
  ],
  reading:
    'The state comes apart and takes its infrastructure with it: legitimacy cut at the divergence, decaying four times as fast, canals abandoned and the ports down to a quarter.',
});

/** A conquest: the winner absorbs, so reach and population step up. */
export const conquest = (): Lever => ({
  archetype: 'conquest',
  overrides: {
    'conflict.logistics.range_penalty': '0.0002',
    'conflict.recruitment.surplus_share': '0.2',
    'trade.route.min_reach': '0.35',
    // A conquest that holds is a bigger single market with one set of roads.
    'trade.route.risk_premium': '0.12',
    'trade.port.throughput_cap': '140000',
    'agriculture.irrigation.build_share': '0.12',
  },
  shocks: [
    {
      key: 'conflict_lanchester.strength',
      factor: 2.5,
      rationale: 'The campaign that historically stopped here does not stop.',
    },
  ],
  reading:
    'Armies project further for less, and what they take stays taken: half the distance penalty, double the recruitment, safer roads across the whole territory and more surplus going into canals.',
});

/** A conquest fails: the army breaks and the frontier closes. */
export const conquestFails = (): Lever => ({
  archetype: 'conquest fails',
  overrides: {
    'conflict.logistics.range_penalty': '0.0009',
    'conflict.attrition.baseline': '0.35',
    'trade.route.risk_premium': '0.55',
    'trade.port.throughput_cap': '25000',
  },
  shocks: [
    {
      key: 'conflict_lanchester.strength',
      factor: 0.3,
      rationale: 'The force that historically won is destroyed at the divergence.',
    },
  ],
  reading:
    'The campaign fails and the frontier closes behind it: strength cut to a third, attrition raised, the reach penalty more than doubled and the roads less safe.',
});

/** A pandemic that never happens, or one held down. */
export const plagueAverted = (): Lever => ({
  archetype: 'plague averted',
  overrides: {
    'disease.seird.beta_baseline': '0.035',
    'disease.spatial.coupling_strength': '0.005',
    'disease.seird.case_fatality': '0.05',
    'demography.mortality.plague_coefficient': '0.005',
  },
  shocks: [],
  reading:
    'Transmission cut to a tenth, spatial coupling to a tenth, case fatality to a quarter. The dying stops being a brake on population.',
});

/** A pandemic far worse than the one that happened. */
export const plagueWorse = (): Lever => ({
  archetype: 'plague worse',
  overrides: {
    'disease.seird.beta_baseline': '0.7',
    'disease.spatial.coupling_strength': '0.2',
    'disease.seird.case_fatality': '0.45',
    'demography.mortality.plague_coefficient': '0.15',
  },
  shocks: [
    {
      key: 'disease_seird.infectious',
      factor: 40,
      rationale: 'The outbreak is seeded hard at the point of divergence.',
    },
  ],
  reading:
    'Transmission doubled, fatality more than doubled, and the compartment seeded at the divergence year.',
});

/** A population catastrophe that does not happen. */
export const populationSpared = (): Lever => ({
  archetype: 'population spared',
  overrides: {
    'disease.seird.case_fatality': '0.04',
    'demography.mortality.infant_baseline': '0.15',
    'demography.mortality.plague_coefficient': '0.005',
  },
  shocks: [],
  reading:
    'The mortality that historically emptied this region does not arrive: fatality and infant mortality both cut sharply.',
});

/** A demographic catastrophe. */
export const populationCollapse = (): Lever => ({
  archetype: 'population collapse',
  overrides: {
    'demography.mortality.infant_baseline': '0.4',
  },
  shocks: [
    {
      key: 'demography.population',
      factor: 0.35,
      rationale: 'Two thirds of the people are gone within the divergence year.',
    },
  ],
  reading: 'Population cut by two thirds at the divergence, against raised baseline mortality.',
});

/** Technology arrives early and spreads. */
export const technologyEarly = (): Lever => ({
  archetype: 'technology early',
  overrides: {
    'technology.diffusion.contact_rate': '0.24',
    'technology.adoption.speed': '0.3',
    'technology.adoption.threshold': '0.25',
    'technology.diffusion.forgetting_rate': '0.0002',
  },
  shocks: [
    {
      key: 'technology_diffusion.stock',
      factor: 3,
      rationale: 'The invention lands at the divergence rather than centuries later.',
    },
  ],
  reading:
    'Contact rate tripled, adoption speed tripled, the threshold halved and the stock stepped up at the divergence.',
});

/** Technology that never arrives, or is lost. */
export const technologyLost = (): Lever => ({
  archetype: 'technology lost',
  overrides: {
    'technology.diffusion.contact_rate': '0.02',
    'technology.adoption.speed': '0.03',
    'technology.adoption.threshold': '0.8',
    'technology.diffusion.forgetting_rate': '0.006',
  },
  shocks: [
    {
      key: 'technology_diffusion.stock',
      factor: 0.2,
      rationale: 'What was known is lost at the divergence.',
    },
  ],
  reading:
    'Contact and adoption cut to a quarter, the threshold raised, and knowledge forgotten six times faster.',
});

/** Trade opens: long routes become worth running. */
export const tradeOpens = (): Lever => ({
  archetype: 'trade opens',
  overrides: {
    'trade.route.risk_premium': '0.08',
    'trade.route.upkeep_weight': '0.1',
    'trade.port.throughput_cap': '200000',
    'trade.gravity.distance_exponent': '0.6',
    'trade.route.min_reach': '0.4',
  },
  shocks: [],
  reading:
    'Distance stops mattering as much: risk premium down to a quarter, the port cap quadrupled and the distance exponent cut.',
});

/** Trade closes: the network stops paying for itself. */
export const tradeCloses = (): Lever => ({
  archetype: 'trade closes',
  overrides: {
    'trade.route.risk_premium': '0.75',
    'trade.route.upkeep_weight': '0.7',
    'trade.port.throughput_cap': '8000',
    'trade.gravity.distance_exponent': '1.8',
  },
  shocks: [],
  reading:
    'The roads stop paying: risk premium up two and a half times, the port cap cut to a sixth, distance punished harder.',
});

/** An industrial takeoff. */
export const industrialise = (): Lever => ({
  archetype: 'industrialise',
  overrides: {
    'technology.diffusion.contact_rate': '0.3',
    'technology.adoption.speed': '0.35',
    'economy.capital.depreciation': '0.02',
    'economy.labour.urban_share_cap': '0.75',
    'economy.surplus.extraction_rate': '0.4',
    'agriculture.yield.tfp_exponent': '0.6',
  },
  shocks: [],
  reading:
    'Capital sticks, cities take three quarters of the workforce, surplus extraction rises and yield responds much harder to it.',
});

/** Agriculture never takes, or gives out. */
export const agricultureFails = (): Lever => ({
  archetype: 'agriculture fails',
  overrides: {
    'agriculture.yield.base': '0.35',
    'agriculture.soil.depletion_rate': '0.014',
    'agriculture.soil.regeneration_rate': '0.002',
    'economy.labour.urban_share_cap': '0.03',
  },
  shocks: [],
  reading:
    'Yield cut to under a third, soil depleting seven times faster than it recovers, and cities capped at three percent of the workforce.',
});

/** Irrigation, canals, roads: the state builds. */
export const publicWorks = (): Lever => ({
  archetype: 'public works',
  overrides: {
    'agriculture.irrigation.build_share': '0.2',
    'agriculture.irrigation.capital_decay': '0.008',
    'trade.route.upkeep_weight': '0.12',
    'economy.surplus.extraction_rate': '0.35',
  },
  shocks: [],
  reading:
    'A fifth of the surplus goes into infrastructure and it decays at a third the rate.',
});

/** Ideology or religion turns over. */
export const culturalTurn = (): Lever => ({
  archetype: 'cultural turn',
  overrides: {
    'culture.replicator.selection_strength': '0.85',
    'culture.transmission.vertical_bias': '0.35',
    'culture.innovation.novelty_rate': '0.04',
    'culture.transmission.base_contact': '0.15',
  },
  shocks: [
    {
      key: 'culture_replicator.sectA',
      factor: 0.25,
      rationale: 'The dominant tradition loses its hold at the divergence.',
    },
  ],
  reading:
    'Selection strength doubled and inherited belief halved, so the majority tradition can actually be displaced.',
});

/** Elite overproduction and internal conflict. */
export const internalStrife = (): Lever => ({
  archetype: 'internal strife',
  overrides: {
    'politics.elite.production_rate': '0.0042',
    'politics.elite.overproduction_threshold': '1.1',
    'politics.legitimacy.decay': '0.055',
    'conflict.attrition.baseline': '0.3',
  },
  shocks: [],
  reading:
    'Elites produced nearly five times as fast against a lowered threshold, so the ratio sits above it and stays there.',
});

/** No structural handle exists. Named rather than faked. */
export const unmapped = (missing: string): Lever => ({
  archetype: 'unmapped',
  overrides: none,
  shocks: [],
  reading: `No structural reading. ${missing}`,
});
