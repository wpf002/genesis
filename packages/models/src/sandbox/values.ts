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
  'politics.state.fragmentation_pressure': '0.5',

  // culture
  'culture.replicator.selection_strength': '0.4',
  'culture.transmission.vertical_bias': '0.8',
  'culture.innovation.novelty_rate': '0.01',

  // technology
  'technology.diffusion.contact_rate': '0.08',
  'technology.adoption.threshold': '0.5',
};
