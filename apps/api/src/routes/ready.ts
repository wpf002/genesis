// Readiness.
//
// `/health` answers "is this process alive". It is cheap and it is a liveness
// probe, so it must not do work that can fail for reasons unrelated to being
// alive.
//
// `/ready` answers "is this build sound", which is a different question with a
// different cost. It re-derives the two invariants that would make every answer
// this service gives worthless if they were broken - the kernel is deterministic,
// and the provenance gate still blocks - rather than reporting a flag somebody
// set at boot.

import type { FastifyInstance } from 'fastify';
import { KERNEL_VERSION, Run } from '@genesis/kernel';
import {
  buildDependencyGraph,
  gateCheck,
  ParamRegistry,
  RIGOR_PARAMS,
  SANDBOX_PARAMS,
} from '@genesis/params';
import { sandboxModules } from '@genesis/models';
import { REPLAY_VERSION, SCENARIO_PACKS } from '@genesis/replay';

/** Short enough to run on a probe, long enough to exercise every subsystem. */
const PROBE_TICKS = 40;

interface Check {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

function determinismProbe(): Check {
  const hashOf = () => {
    const run = new Run({ seed: 20260815n, modules: sandboxModules() });
    run.advanceTo(PROBE_TICKS);
    return run.stateHash();
  };
  const first = hashOf();
  const second = hashOf();
  return {
    name: 'determinism',
    ok: first === second,
    detail:
      first === second
        ? `${PROBE_TICKS} ticks, ${first.slice(0, 16)}`
        : `two runs of one seed disagreed: ${first.slice(0, 16)} vs ${second.slice(0, 16)}`,
  };
}

function gateProbe(): Check {
  const registry = new ParamRegistry();
  registry.registerAll(SANDBOX_PARAMS);

  const run = new Run({ seed: 1n, modules: sandboxModules() });
  run.advanceTo(PROBE_TICKS);
  const graph = buildDependencyGraph(run.ledger.all());
  const report = gateCheck({ mode: 'RIGOR', graph, registry, env: process.env });

  // A Rigor run over Sandbox parameters must be blocked. A gate that passes here
  // is a gate that has stopped working, so BLOCKED is the healthy answer.
  const ok = report.status === 'BLOCKED';
  return {
    name: 'gate',
    ok,
    detail: ok
      ? `blocks Rigor over INVENTED (${report.violations.length} violations)`
      : `expected BLOCKED, got ${report.status}`,
  };
}

function rigorProbe(): Check {
  // ADR 0005. If this ever stops being zero, it happened on purpose and the
  // model cards say so; a surprise here means something was registered by
  // accident.
  const ok = RIGOR_PARAMS.length === 0;
  return {
    name: 'rigor',
    ok,
    detail: ok
      ? '0 calibrated parameters, runs refused (ADR 0005)'
      : `${RIGOR_PARAMS.length} parameters registered without a model card`,
  };
}

function packProbe(): Check {
  const ids = new Set(SCENARIO_PACKS.map((pack) => pack.id));
  const allSandbox = SCENARIO_PACKS.every((pack) => pack.mode === 'SANDBOX');
  const ok = ids.size === SCENARIO_PACKS.length && allSandbox;
  return {
    name: 'packs',
    ok,
    detail: ok
      ? `${SCENARIO_PACKS.length} packs, all Sandbox`
      : 'packs have duplicate ids or a non-Sandbox mode',
  };
}

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async (_request, reply) => {
    const started = process.hrtime.bigint();
    const checks = [determinismProbe(), gateProbe(), rigorProbe(), packProbe()];
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    const ready = checks.every((check) => check.ok);
    return reply.code(ready ? 200 : 503).send({
      ready,
      checks,
      versions: {
        kernel: KERNEL_VERSION,
        replay: REPLAY_VERSION,
      },
      params: {
        sandbox: SANDBOX_PARAMS.length,
        rigor: RIGOR_PARAMS.length,
      },
      elapsedMs: Math.round(elapsedMs),
      // Never let a client guess which track produced a payload.
      mode: null,
    });
  });
}
