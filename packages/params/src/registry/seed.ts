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
  { key: 'agriculture.irrigation.capital_decay', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Guess. Makes abandoned canals silt up on a human timescale.' },
  { key: 'agriculture.storage.spoilage_rate', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Chosen so granaries buffer one bad year but not three.' },

  // --- demography --------------------------------------------------------
  { key: 'demography.fertility.baseline', unit: 'births_per_woman', provenance: 'INVENTED', note: 'Set near replacement so populations drift rather than explode.' },
  { key: 'demography.mortality.infant_baseline', unit: 'fraction', provenance: 'INVENTED', note: 'Placeholder pending any real life table.' },
  { key: 'demography.mortality.famine_elasticity', unit: 'dimensionless', provenance: 'INVENTED', note: 'Tuned so a famine is visible in the population curve within a decade.' },
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
  { key: 'trade.route.risk_premium', unit: 'fraction', provenance: 'INVENTED', note: 'Makes long routes unattractive during conflict.' },
  { key: 'trade.port.throughput_cap', unit: 'tonnes_per_year', provenance: 'INVENTED', note: 'Round number chosen to create a bottleneck worth seeing.' },

  // --- disease -----------------------------------------------------------
  { key: 'disease.seird.beta_baseline', unit: 'per_day', provenance: 'INVENTED', note: 'Transmission rate producing an epidemic that peaks in a plausible number of months.' },
  { key: 'disease.seird.incubation_days', unit: 'days', provenance: 'INVENTED', note: 'Generic value; not tied to any specific historical pathogen.' },
  { key: 'disease.seird.case_fatality', unit: 'fraction', provenance: 'INVENTED', note: 'Severe enough to matter demographically. Not drawn from any source.' },
  { key: 'disease.spatial.coupling_strength', unit: 'dimensionless', provenance: 'INVENTED', note: 'Tuned so disease follows trade routes at a watchable speed.' },

  // --- conflict ----------------------------------------------------------
  { key: 'conflict.lanchester.exponent', unit: 'dimensionless', provenance: 'INVENTED', note: 'Square-law exponent assumed; the choice between linear and square was not tested.' },
  { key: 'conflict.attrition.baseline', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Set so wars end in years rather than generations.' },
  { key: 'conflict.logistics.range_penalty', unit: 'fraction_per_km', provenance: 'INVENTED', note: 'Invented to stop armies projecting power across the map.' },

  // --- politics ----------------------------------------------------------
  { key: 'politics.legitimacy.decay', unit: 'fraction_per_year', provenance: 'INVENTED', note: 'Legitimacy erodes on a scale that makes dynasties turn over.' },
  { key: 'politics.elite.overproduction_threshold', unit: 'ratio', provenance: 'INVENTED', note: 'Borrowed shape from cliodynamics, but the number itself is a guess.' },
  { key: 'politics.state.fragmentation_pressure', unit: 'dimensionless', provenance: 'INVENTED', note: 'Chosen so large empires are unstable, which is the behavior I wanted.' },

  // --- culture -----------------------------------------------------------
  { key: 'culture.replicator.selection_strength', unit: 'dimensionless', provenance: 'INVENTED', note: 'Replicator dynamics selection term set for visible but not instant sect turnover.' },
  { key: 'culture.transmission.vertical_bias', unit: 'fraction', provenance: 'INVENTED', note: 'Most transmission is vertical because that is the usual assumption.' },
  { key: 'culture.innovation.novelty_rate', unit: 'per_year', provenance: 'INVENTED', note: 'Rate picked so something new appears every few generations.' },

  // --- technology --------------------------------------------------------
  { key: 'technology.diffusion.contact_rate', unit: 'per_year', provenance: 'INVENTED', note: 'Diffusion speed tuned to the map, not to any diffusion study.' },
  { key: 'technology.adoption.threshold', unit: 'fraction', provenance: 'INVENTED', note: 'S-curve midpoint placed where the curve looks right.' },
];
