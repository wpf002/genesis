// The Sandbox constants, all INVENTED, all labeled as such.
//
// These exist in Phase 2 so the gate has something real to block. Every note is
// the honest reason the number was picked, which is almost always "it makes the
// simulation behave the way I expected." That is exactly what INVENTED means and
// why nothing here may reach a Rigor output.
//
// Phase 5 will consume these. Phase 4 may promote a few to CALIBRATED, at which
// point they move out of this file and arrive with a posterior.

import type { ParamDecl } from './registry.js';

export const SANDBOX_PARAMS: readonly ParamDecl[] = [
  // --- agriculture -------------------------------------------------------
  { key: 'agriculture.yield.tfp_exponent', unit: 'dimensionless', provenance: 'INVENTED', note: 'Cobb-Douglas exponent picked so yield responds visibly but does not run away.', bounds: { min: '0.1', max: '0.9' } },
  { key: 'agriculture.yield.climate_sensitivity', unit: 'tonnes_per_hectare_per_degree', provenance: 'INVENTED', note: 'Scaled so a 1C anomaly moves yield by roughly a tenth.' },
  { key: 'agriculture.soil.depletion_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Slow enough that depletion matters over centuries, not decades.' },
  { key: 'agriculture.soil.regeneration_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Added when a 5000-year run drove soil to its floor and never recovered. Set so fallow land comes back over a few generations.' },
  { key: 'agriculture.irrigation.capital_decay', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Guess. Makes abandoned canals silt up on a human timescale.' },
  { key: 'agriculture.yield.technology_weight', unit: 'dimensionless', provenance: 'INVENTED', note: 'How much adopted technology multiplies yield. Added when a sensitivity sweep showed technology moved terminal population by 0.0% because nothing read it.' },
  { key: 'agriculture.storage.import_weight', unit: 'tonnes_per_year', provenance: 'INVENTED', note: 'Food arriving by trade rather than out of the ground. Added for the same reason: closing every road cost a region nothing.' },
  { key: 'agriculture.storage.import_halfsat', unit: 'tonnes_per_year', provenance: 'INVENTED', note: 'Trade volume at which imports reach half their ceiling. A fixed reference, because normalising by the port cap made raising the cap reduce imports.' },
  { key: 'agriculture.storage.spoilage_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Chosen so granaries buffer one bad year but not three.' },

  // --- demography --------------------------------------------------------
  { key: 'demography.fertility.baseline', unit: 'births_per_woman', provenance: 'INVENTED', note: 'Set near replacement so populations drift rather than explode.' },
  { key: 'demography.mortality.infant_baseline', unit: 'fraction', provenance: 'INVENTED', note: 'Placeholder pending any real life table.' },
  { key: 'demography.mortality.famine_elasticity', unit: 'dimensionless', provenance: 'INVENTED', note: 'Raised from 1.5 to 4.0 after a 5000-year run grew the population to 400 billion while starving: famine mortality has to exceed baseline fertility, or nothing bounds growth.' },
  { key: 'demography.migration.push_threshold', unit: 'fraction', provenance: 'INVENTED', note: 'Arbitrary. Migration should start before starvation, not after.' },
  { key: 'demography.cohort.width_years', unit: 'years', provenance: 'INVENTED', note: 'Five-year cohorts because that is the conventional bucket, not because it was fit.' },

  // --- economy -----------------------------------------------------------
  { key: 'economy.surplus.extraction_rate', unit: 'fraction', provenance: 'INVENTED', note: 'Elite extraction set high enough to fund a state, low enough to avoid instant collapse.' },
  { key: 'economy.labour.urban_share_cap', unit: 'fraction', provenance: 'INVENTED', note: 'Caps urbanisation at a pre-industrial-looking ceiling.' },
  { key: 'economy.capital.depreciation', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Standard-looking round number with no source behind it.' },
  { key: 'economy.price.elasticity_grain', unit: 'dimensionless', provenance: 'INVENTED', note: 'Chosen so grain prices spike in shortage without going to infinity.' },

  // --- trade -------------------------------------------------------------
  { key: 'trade.gravity.distance_exponent', unit: 'dimensionless', provenance: 'INVENTED', note: 'Gravity model exponent set to the textbook value out of habit, not evidence.' },
  { key: 'trade.gravity.mass_exponent', unit: 'dimensionless', provenance: 'INVENTED', note: 'Symmetric with the distance exponent because it looked tidy.' },
  { key: 'trade.route.max_disorder', unit: 'fraction', provenance: 'INVENTED', note: 'Ceiling on how much fragmentation may throttle trade. Even a collapsing state moves some goods.' },
  { key: 'trade.route.fragmentation_penalty', unit: 'dimensionless', provenance: 'INVENTED', note: 'How much a fragmented state throttles its own trade. Added for the same reason: fragmentation was computed and never read.' },
  { key: 'trade.route.risk_premium', unit: 'fraction', provenance: 'INVENTED', note: 'Makes long routes unattractive during conflict.' },
  { key: 'trade.port.throughput_cap', unit: 'tonnes_per_year', provenance: 'INVENTED', note: 'Round number chosen to create a bottleneck worth seeing.' },

  // --- disease -----------------------------------------------------------
  { key: 'disease.seird.beta_baseline', unit: 'per_day', provenance: 'INVENTED', note: 'Transmission rate producing an epidemic that peaks in a plausible number of months.' },
  { key: 'disease.seird.incubation_days', unit: 'days', provenance: 'INVENTED', note: 'Generic value; not tied to any specific historical pathogen.' },
  { key: 'disease.seird.case_fatality', unit: 'fraction', provenance: 'INVENTED', note: 'Severe enough to matter demographically. Not drawn from any source.' },
  { key: 'disease.spatial.coupling_strength', unit: 'dimensionless', provenance: 'INVENTED', note: 'Tuned so disease follows trade routes at a watchable speed.' },

  // --- conflict ----------------------------------------------------------
  { key: 'conflict.lanchester.exponent', unit: 'dimensionless', provenance: 'INVENTED', note: 'Square-law exponent assumed; the choice between linear and square was not tested.' },
  { key: 'conflict.casualties.population_weight', unit: 'people_per_unit_strength', provenance: 'INVENTED', note: 'How many people a unit of army losses costs the population. Added when a sweep showed every conquest scenario moved population by 0.0% because nothing read conflict losses.' },
  { key: 'conflict.attrition.baseline', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Set so wars end in years rather than generations.' },
  { key: 'conflict.logistics.range_penalty', unit: 'fraction_per_km', provenance: 'INVENTED', note: 'Invented to stop armies projecting power across the map.' },

  // --- politics ----------------------------------------------------------
  { key: 'politics.legitimacy.decay', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Legitimacy erodes on a scale that makes dynasties turn over.' },
  { key: 'politics.elite.overproduction_threshold', unit: 'ratio', provenance: 'INVENTED', note: 'Borrowed shape from cliodynamics, but the number itself is a guess.' },
  { key: 'politics.elite.production_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Was an inline literal until a 5000-year run pinned fragmentation at 0.9 and crushed legitimacy to zero. Tuned so the elite-to-positions ratio sits near the threshold and climate noise pushes it over episodically.' },
  { key: 'politics.elite.attrition_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Rate elites are shed. Sets the equilibrium elite count together with production_rate.' },
  { key: 'politics.legitimacy.restoration_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'How fast full bellies buy legitimacy back. Must outpace decay or every state collapses once and never recovers.' },
  { key: 'politics.state.fragmentation_pressure', unit: 'dimensionless', provenance: 'INVENTED', note: 'Chosen so large empires are unstable, which is the behavior I wanted.' },

  // --- culture -----------------------------------------------------------
  { key: 'culture.replicator.selection_strength', unit: 'dimensionless', provenance: 'INVENTED', note: 'Replicator dynamics selection term set for visible but not instant sect turnover.' },
  { key: 'culture.transmission.vertical_bias', unit: 'fraction', provenance: 'INVENTED', note: 'Most transmission is vertical because that is the usual assumption.' },
  { key: 'culture.innovation.novelty_rate', unit: 'per_year', provenance: 'INVENTED', note: 'Rate picked so something new appears every few generations.' },

  // --- technology --------------------------------------------------------
  { key: 'technology.diffusion.contact_rate', unit: 'per_year', provenance: 'INVENTED', note: 'Diffusion speed tuned to the map, not to any diffusion study.' },
  { key: 'technology.adoption.threshold', unit: 'fraction', provenance: 'INVENTED', note: 'S-curve midpoint placed where the curve looks right.' },

  // --- registered out of subsystem code (were inline literals) ----------
  { key: 'agriculture.yield.base', unit: 'tonnes_per_hectare', provenance: 'INVENTED', note: 'Baseline yield before climate and soil. Was inline; registered so the gate can see it.' },
  { key: 'agriculture.soil.minimum_quality', unit: 'fraction', provenance: 'INVENTED', note: 'Floor soil cannot fall below. Stops total collapse becoming permanent.' },
  { key: 'agriculture.irrigation.build_share', unit: 'fraction', provenance: 'INVENTED', note: 'Share of surplus spent on canals when the state is intact.' },
  { key: 'agriculture.irrigation.bonus_halfsat', unit: 'dimensionless', provenance: 'INVENTED', note: 'Capital at which the irrigation yield bonus reaches half its maximum.' },
  { key: 'demography.population.initial', unit: 'people', provenance: 'INVENTED', note: 'Starting population. Arbitrary; the model is scale-free above it.' },
  { key: 'demography.consumption.need_per_head', unit: 'tonnes_per_person', provenance: 'INVENTED', note: 'Food a person needs per tick. Sets the population the storage can carry.' },
  { key: 'demography.consumption.max_food_ratio', unit: 'ratio', provenance: 'INVENTED', note: 'Cap on food per head, so surplus does not make fertility unbounded.' },
  { key: 'demography.mortality.plague_coefficient', unit: 'dimensionless', provenance: 'INVENTED', note: 'How hard the infectious fraction hits population. Read a tick late by module order.' },
  { key: 'demography.migration.outflow_share', unit: 'fraction', provenance: 'INVENTED', note: 'Share of the shortfall that leaves per tick.' },
  { key: 'demography.migration.outflow_cap', unit: 'fraction', provenance: 'INVENTED', note: 'Ceiling on outflow, so one bad year cannot empty a region.' },
  { key: 'disease.seird.removal_rate', unit: 'fraction_per_tick', provenance: 'INVENTED', note: 'Rate the infectious leave the compartment, split into deaths and recoveries.' },
  { key: 'disease.seird.waning_rate', unit: 'fraction_per_tick', provenance: 'INVENTED', note: 'Immunity loss. Without it the toy gets exactly one epidemic in 5000 years.' },
  { key: 'disease.spatial.initial_pressure', unit: 'fraction', provenance: 'INVENTED', note: 'Import pressure at tick zero.' },
  { key: 'disease.spatial.arrival_magnitude', unit: 'fraction', provenance: 'INVENTED', note: 'Size of a seeded outbreak when one arrives.' },
  { key: 'disease.spatial.arrival_odds', unit: 'one_in_n', provenance: 'INVENTED', note: 'Odds of a seeded arrival per tick, drawn from the module substream.' },
  { key: 'conflict.recruitment.surplus_share', unit: 'fraction', provenance: 'INVENTED', note: 'Share of surplus that becomes army strength.' },
  { key: 'conflict.logistics.nominal_range_km', unit: 'km', provenance: 'INVENTED', note: 'Stand-in distance until a real map exists. The range penalty multiplies it.' },
  { key: 'conflict.logistics.support_halfsat', unit: 'dimensionless', provenance: 'INVENTED', note: 'Capital at which logistics support reaches half its maximum.' },
  { key: 'conflict.logistics.support_weight', unit: 'fraction', provenance: 'INVENTED', note: 'How much capital can buy back reach lost to distance.' },
  { key: 'conflict.logistics.min_reach', unit: 'fraction', provenance: 'INVENTED', note: 'Floor on reach, so an army is never completely immobile.' },
  { key: 'economy.price.ceiling', unit: 'index', provenance: 'INVENTED', note: 'Cap on grain price, so scarcity cannot send it to infinity.' },
  { key: 'economy.price.floor', unit: 'index', provenance: 'INVENTED', note: 'Floor on grain price.' },
  { key: 'politics.elite.initial_share', unit: 'fraction', provenance: 'INVENTED', note: 'Elite share of population at tick zero.' },
  { key: 'politics.elite.positions_floor', unit: 'fraction', provenance: 'INVENTED', note: 'Minimum positions available, so the ratio does not divide by zero in a rural world.' },
  { key: 'culture.sect.initial_share', unit: 'fraction', provenance: 'INVENTED', note: 'Starting split between the two sects. Even, because nothing justifies otherwise.' },
  { key: 'culture.transmission.initial_churn', unit: 'fraction', provenance: 'INVENTED', note: 'Cultural turnover rate at tick zero.' },
  { key: 'culture.transmission.base_contact', unit: 'fraction', provenance: 'INVENTED', note: 'Contact floor before urbanisation adds to it.' },
  { key: 'culture.transmission.min_churn', unit: 'fraction', provenance: 'INVENTED', note: 'Floor on turnover, so a rural culture is slow rather than frozen.' },
  { key: 'technology.diffusion.forgetting_rate', unit: 'fraction_per_tick', provenance: 'INVENTED', note: 'Rate accumulated technology is lost when not reinforced.' },
  { key: 'technology.adoption.speed', unit: 'fraction_per_tick', provenance: 'INVENTED', note: 'Scales the adoption S-curve against the threshold.' },
  { key: 'trade.route.nominal_distance_km', unit: 'km', provenance: 'INVENTED', note: 'Stand-in distance until a real map exists.' },
  { key: 'trade.route.distance_scale', unit: 'km', provenance: 'INVENTED', note: 'Divisor turning nominal distance into a friction fraction.' },
  { key: 'trade.route.upkeep_halfsat', unit: 'dimensionless', provenance: 'INVENTED', note: 'Capital at which route upkeep reaches half its maximum.' },
  { key: 'trade.route.upkeep_weight', unit: 'fraction', provenance: 'INVENTED', note: 'How much capital can buy back reach lost to distance.' },
  { key: 'trade.route.min_reach', unit: 'fraction', provenance: 'INVENTED', note: 'Floor on route reach.' },
];
