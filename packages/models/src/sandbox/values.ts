// Values for the Sandbox constants.
//
// The registry in @genesis/params declares what each parameter is and why it was
// chosen. This file holds what it equals. Split on purpose: a value cannot be
// used unless its key is declared, and resolve.ts enforces that at construction.
//
// Every one of these is INVENTED. None may reach a Rigor output, and the gate
// blocks that path rather than trusting this comment.
//
// Decimal strings, not numbers. Fx.parse reads them exactly; a float literal
// would introduce a value the fixed-point scale cannot represent.

export const SANDBOX_VALUES: Readonly<Record<string, string>> = {
  // agriculture
  'agriculture.yield.tfp_exponent': '0.3',
  'agriculture.yield.climate_sensitivity': '0.1',
  'agriculture.soil.depletion_rate': '0.002',
  'agriculture.soil.regeneration_rate': '0.03',
  'agriculture.irrigation.capital_decay': '0.02',
  'agriculture.storage.spoilage_rate': '0.15',
  'agriculture.yield.technology_weight': '1.2',
  'agriculture.storage.import_weight': '0.6',

  // demography
  'demography.fertility.baseline': '2.1',
  'demography.mortality.infant_baseline': '0.25',
  'demography.mortality.famine_elasticity': '4',
  'demography.migration.push_threshold': '0.8',
  'demography.cohort.width_years': '5',

  // economy
  'economy.surplus.extraction_rate': '0.25',
  'economy.labour.urban_share_cap': '0.15',
  'economy.capital.depreciation': '0.05',
  'economy.price.elasticity_grain': '0.6',

  // trade
  'trade.gravity.distance_exponent': '1',
  'trade.gravity.mass_exponent': '1',
  'trade.route.risk_premium': '0.3',
  'trade.port.throughput_cap': '50000',

  // disease
  'disease.seird.beta_baseline': '0.35',
  'disease.seird.incubation_days': '5',
  'disease.seird.case_fatality': '0.2',
  'disease.spatial.coupling_strength': '0.05',

  // conflict
  'conflict.lanchester.exponent': '2',
  'conflict.attrition.baseline': '0.2',
  'conflict.logistics.range_penalty': '0.0004',

  // politics
  'politics.legitimacy.decay': '0.03',
  'politics.elite.overproduction_threshold': '1.4',
  'politics.elite.production_rate': '0.0009',
  'politics.elite.attrition_rate': '0.01',
  'politics.legitimacy.restoration_rate': '0.06',
  'politics.state.fragmentation_pressure': '0.5',

  // culture
  'culture.replicator.selection_strength': '0.4',
  'culture.transmission.vertical_bias': '0.8',
  'culture.innovation.novelty_rate': '0.01',

  // technology
  'technology.diffusion.contact_rate': '0.08',
  'technology.adoption.threshold': '0.5',

  // registered out of subsystem code
  'agriculture.yield.base': '1.2',
  'agriculture.soil.minimum_quality': '0.1',
  'agriculture.irrigation.build_share': '0.05',
  'agriculture.irrigation.bonus_halfsat': '5',
  'demography.population.initial': '1000',
  'demography.consumption.need_per_head': '0.002',
  'demography.consumption.max_food_ratio': '2',
  // Raised from 0.05, where an epidemic killed about half a percent of what
  // births added and was invisible. 2.5 was the other mistake: it made disease
  // dominate everything and cut baseline population by 95%. At 0.4 an epidemic
  // is a visible dip in the timeline.
  //
  // It does not change where the run ends up, and that is the model, not the
  // number. Population sits at the food supply's carrying capacity, so any
  // mortality shock is made up within a generation - a deadlier plague even ends
  // slightly *higher*, because fewer mouths means more food each. Only levers
  // that move carrying capacity (yield, technology, trade, irrigation) shift the
  // terminal state. Counterfactuals here are read in the timeline, not the total.
  'demography.mortality.plague_coefficient': '0.4',
  'demography.migration.outflow_share': '0.1',
  'demography.migration.outflow_cap': '0.05',
  'disease.seird.removal_rate': '0.2',
  'disease.seird.waning_rate': '0.01',
  'disease.spatial.initial_pressure': '0.001',
  'disease.spatial.arrival_magnitude': '0.02',
  'disease.spatial.arrival_odds': '200',
  'conflict.recruitment.surplus_share': '0.1',
  'conflict.logistics.nominal_range_km': '500',
  'conflict.logistics.support_halfsat': '10',
  'conflict.logistics.support_weight': '0.2',
  'conflict.logistics.min_reach': '0.05',
  'economy.price.ceiling': '20',
  'economy.price.floor': '0.05',
  'politics.elite.initial_share': '0.01',
  'politics.elite.positions_floor': '0.01',
  'culture.sect.initial_share': '0.5',
  'culture.transmission.initial_churn': '0.1',
  'culture.transmission.base_contact': '0.05',
  'culture.transmission.min_churn': '0.001',
  'technology.diffusion.forgetting_rate': '0.001',
  'technology.adoption.speed': '0.1',
  'trade.route.nominal_distance_km': '1000',
  'trade.route.distance_scale': '10000',
  'trade.route.upkeep_halfsat': '20',
  'trade.route.upkeep_weight': '0.3',
  'trade.route.min_reach': '0.05',
};
