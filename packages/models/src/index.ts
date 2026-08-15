/**
 * @genesis/models — domain modules.
 *
 * rigor/   Phase 3–4 found nothing shippable. See docs/model-cards/.
 * sandbox/ Phase 5. Every constant INVENTED, every run watermarked.
 *
 * Module execution order is the array below and nothing else (locked invariant
 * #7). It is written out rather than derived, and it follows the roadmap's
 * dependency order: agriculture -> demography -> economy -> trade -> disease ->
 * conflict -> politics -> culture -> technology.
 */

import type { SimModule } from '@genesis/kernel';
import { ALL_REGIONS } from './regions.js';
import { agriculture } from './sandbox/agriculture.js';
import { conflictLanchester, conflictLogistics } from './sandbox/conflict.js';
import { cultureReplicator, cultureTransmission } from './sandbox/culture.js';
import { demography } from './sandbox/demography.js';
import { diseaseSeird, diseaseSpatial } from './sandbox/disease.js';
import { economy } from './sandbox/economy.js';
import { irrigation, tradeRoutes } from './sandbox/infrastructure.js';
import { migration } from './sandbox/migration.js';
import { politicsElites, politicsLegitimacy } from './sandbox/politics.js';
import { prices } from './sandbox/prices.js';
import { SandboxParams } from './sandbox/resolve.js';
import { technologyAdoption, technologyDiffusion } from './sandbox/technology.js';
import { trade } from './sandbox/trade.js';

export { OverrideRejected, SandboxParams } from './sandbox/resolve.js';
export { SANDBOX_VALUES } from './sandbox/values.js';

/** The order subsystems run in. Adding one appends here, deliberately. */
export const MODULE_ORDER: readonly string[] = [
  'agriculture',
  'migration',
  'demography',
  'economy',
  'trade',
  'disease_spatial',
  'disease_seird',
  'conflict_logistics',
  'conflict_lanchester',
  'prices',
  'politics_elites',
  'politics_legitimacy',
  'culture_transmission',
  'culture_replicator',
  'irrigation',
  'trade_routes',
  'technology_diffusion',
  'technology_adoption',
];

export { ALL_REGIONS, REGION_TABLE, type RegionInfo } from './regions.js';

/**
 * Every country in Natural Earth 110m. A run may use all of them or a subset;
 * order is the array's order and it is the map order too.
 */
export const REGIONS: readonly string[] = ALL_REGIONS;

/** One region's 18 subsystems, prefixed. Empty region id gives the flat run. */
export function regionModules(
  params: SandboxParams,
  region = '',
): readonly SimModule[] {
  return [
    agriculture(params, region),
    migration(params, region),
    demography(params, region),
    economy(params, region),
    trade(params, region),
    diseaseSpatial(params, region),
    diseaseSeird(params, region),
    conflictLogistics(params, region),
    conflictLanchester(params, region),
    prices(params, region),
    politicsElites(params, region),
    politicsLegitimacy(params, region),
    cultureTransmission(params, region),
    cultureReplicator(params, region),
    irrigation(params, region),
    tradeRoutes(params, region),
    technologyDiffusion(params, region),
    technologyAdoption(params, region),
  ];
}

export function sandboxModules(params = new SandboxParams()): readonly SimModule[] {
  const modules = regionModules(params);

  // The declared order is the contract; this catches a module added to one list
  // and not the other rather than letting execution order drift silently.
  const built = modules.map((m) => m.id);
  if (built.length !== MODULE_ORDER.length || built.some((id, i) => id !== MODULE_ORDER[i])) {
    throw new Error(
      `models: MODULE_ORDER is [${MODULE_ORDER.join(', ')}] but built [${built.join(', ')}]`,
    );
  }
  return modules;
}

/**
 * Every region's subsystems, region by region. Execution order is regions in
 * REGIONS order, each running its 18 in MODULE_ORDER - explicit, not derived.
 */
export function worldModules(
  params = new SandboxParams(),
  regions: readonly string[] = REGIONS,
): readonly SimModule[] {
  return regions.flatMap((region) => regionModules(params, region));
}
