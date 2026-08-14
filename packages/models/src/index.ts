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
import { demography } from './sandbox/demography.js';
import { economy } from './sandbox/economy.js';
import { SandboxParams } from './sandbox/resolve.js';
import { trade } from './sandbox/trade.js';

export { SandboxParams } from './sandbox/resolve.js';
export { SANDBOX_VALUES } from './sandbox/values.js';

/** The order subsystems run in. Adding one appends here, deliberately. */
export const MODULE_ORDER: readonly string[] = [
  'agriculture',
  'demography',
  'economy',
  'trade',
];

export function sandboxModules(params = new SandboxParams()): readonly SimModule[] {
  const modules = [agriculture(params), demography(params), economy(params), trade(params)];

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
