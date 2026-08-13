/**
 * @genesis/params — parameter registry and provenance gate.
 *
 * The registry is the only place a parameter can come into existence, and it
 * refuses a declaration that does not say where the number came from.
 */

/** Bumped when the gate's capability changes. Read by bin/gate-check.ts. */
export const PHASE = 2 as const;

export {
  isAdmissibleInRigor,
  MODE,
  PROVENANCE,
  type Mode,
  type Provenance,
} from './provenance/tags.js';

export { ParamRegistry, paramDeclSchema, type ParamDecl } from './registry/registry.js';
export { SANDBOX_PARAMS } from './registry/seed.js';

export {
  buildDependencyGraph,
  findParamPath,
  type DependencyGraph,
} from './provenance/graph.js';

export {
  formatGateReport,
  gateCheck,
  strictnessFor,
  type GateInput,
  type GateReport,
  type GateStatus,
  type GateViolation,
  type Strictness,
  type ViolationReason,
} from './provenance/gate.js';
