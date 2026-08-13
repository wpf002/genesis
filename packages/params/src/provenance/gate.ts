// The provenance gate.
//
// A Rigor run may not emit an output whose dependency path touches an INVENTED
// parameter, or an unregistered one — an unregistered parameter is worse than an
// invented one, because nobody has even claimed where it came from.
//
// The gate has no production bypass (locked invariant #4). GENESIS_PROVENANCE_STRICT
// is honored for local exploration only; under NODE_ENV=production it is ignored
// entirely and the run is blocked.

import { ParamRegistry } from '../registry/registry.js';
import type { Mode } from './tags.js';
import { findParamPath, type DependencyGraph } from './graph.js';

export type GateStatus = 'PASS' | 'BLOCKED' | 'BYPASSED';
export type ViolationReason = 'INVENTED' | 'UNREGISTERED';

export interface GateViolation {
  readonly output: string;
  readonly param: string;
  readonly reason: ViolationReason;
  /** [output, ...intermediate state keys, param] */
  readonly path: readonly string[];
}

export interface GateReport {
  readonly mode: Mode;
  readonly status: GateStatus;
  readonly outputs: readonly string[];
  readonly violations: readonly GateViolation[];
  readonly watermarkRequired: boolean;
  readonly strict: boolean;
  readonly productionLocked: boolean;
}

export interface Strictness {
  readonly strict: boolean;
  /** True when strictness was forced by NODE_ENV and config could not relax it. */
  readonly productionLocked: boolean;
}

export function strictnessFor(env: Readonly<Record<string, string | undefined>>): Strictness {
  if (env['NODE_ENV'] === 'production') {
    return { strict: true, productionLocked: true };
  }
  return { strict: env['GENESIS_PROVENANCE_STRICT'] !== 'false', productionLocked: false };
}

export interface GateInput {
  readonly mode: Mode;
  readonly graph: DependencyGraph;
  readonly registry: ParamRegistry;
  /** Defaults to every output in the graph. */
  readonly outputs?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export function gateCheck(input: GateInput): GateReport {
  const { strict, productionLocked } = strictnessFor(input.env ?? {});
  const outputs = input.outputs ?? input.graph.outputs;

  const violations: GateViolation[] = [];
  for (const output of outputs) {
    const unregistered = findParamPath(
      input.graph,
      output,
      (key) => !input.registry.has(key),
    );
    if (unregistered !== null) {
      violations.push({
        output,
        param: unregistered[unregistered.length - 1] as string,
        reason: 'UNREGISTERED',
        path: unregistered,
      });
      continue;
    }
    const invented = findParamPath(
      input.graph,
      output,
      (key) => input.registry.provenanceOf(key) === 'INVENTED',
    );
    if (invented !== null) {
      violations.push({
        output,
        param: invented[invented.length - 1] as string,
        reason: 'INVENTED',
        path: invented,
      });
    }
  }

  if (input.mode === 'SANDBOX') {
    // Sandbox never blocks. It also never leaves the system unmarked.
    return {
      mode: 'SANDBOX',
      status: 'PASS',
      outputs,
      violations,
      watermarkRequired: true,
      strict,
      productionLocked,
    };
  }

  const status: GateStatus =
    violations.length === 0 ? 'PASS' : strict ? 'BLOCKED' : 'BYPASSED';

  return {
    mode: 'RIGOR',
    status,
    outputs,
    violations,
    watermarkRequired: status !== 'PASS',
    strict,
    productionLocked,
  };
}

export function formatGateReport(report: GateReport): string {
  const lines: string[] = [];
  lines.push(`mode=${report.mode} status=${report.status} outputs=${report.outputs.length}`);
  if (report.status === 'BYPASSED') {
    lines.push(
      '  GENESIS_PROVENANCE_STRICT=false — local exploration only. CI rejects BYPASSED.',
    );
  }
  for (const violation of report.violations) {
    lines.push(`  ${violation.reason} ${violation.param}`);
    lines.push(`    ${violation.path.join(' -> ')}`);
  }
  return lines.join('\n');
}
