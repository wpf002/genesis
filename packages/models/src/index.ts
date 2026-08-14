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

export { SandboxParams } from './sandbox/resolve.js';
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

export function sandboxModules(params = new SandboxParams()): readonly SimModule[] {
  const modules = [
    agriculture(params),
    migration(params),
    demography(params),
    economy(params),
    trade(params),
    diseaseSpatial(params),
    diseaseSeird(params),
    conflictLogistics(params),
    conflictLanchester(params),
    prices(params),
    politicsElites(params),
    politicsLegitimacy(params),
    cultureTransmission(params),
    cultureReplicator(params),
    irrigation(params),
    tradeRoutes(params),
    technologyDiffusion(params),
    technologyAdoption(params),
  ];

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
