// POST /counterfactual
//
// The Phase 7 exit gate: a Rigor run with an intervention whose path touches an
// INVENTED parameter returns 422 and the gate report, naming the parameter and
// the path. It does not return a degraded result, and it does not return 500.

import type { FastifyInstance } from 'fastify';
import { Fx, Run } from '@genesis/kernel';
import {
  buildDependencyGraph,
  gateCheck,
  ParamRegistry,
  RigorUnavailable,
  SANDBOX_PARAMS,
} from '@genesis/params';
import { branch, divergenceTimeline, SANDBOX_WATERMARK } from '@genesis/replay';
import { sandboxModules } from '@genesis/models';
import { z } from 'zod';

const bodySchema = z.object({
  mode: z.enum(['RIGOR', 'SANDBOX']),
  seed: z.string().regex(/^\d+$/),
  forkTick: z.number().int().positive(),
  ticks: z.number().int().positive().max(5000),
  intervention: z.object({
    stateKey: z.string().min(1),
    value: z.string(),
    rationale: z.string().min(1, 'an intervention without a rationale is a guess'),
  }),
});

export async function counterfactualRoutes(app: FastifyInstance) {
  app.post('/counterfactual', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid request', issues: parsed.error.issues });
    }
    const body = parsed.data;

    if (body.forkTick >= body.ticks) {
      return reply.code(400).send({ error: 'forkTick must be before ticks' });
    }

    // Walk the intervention's dependency path before running anything. A Rigor
    // run that touches INVENTED is refused here, with the path named.
    const registry = new ParamRegistry();
    registry.registerAll(SANDBOX_PARAMS);

    const probe = new Run({ seed: BigInt(body.seed), modules: sandboxModules() });
    probe.advanceTo(Math.min(body.forkTick, 50));
    const graph = buildDependencyGraph(probe.ledger.all());

    const targeted = graph.outputs.includes(body.intervention.stateKey);
    const report = gateCheck({
      mode: body.mode,
      graph,
      registry,
      env: process.env,
      ...(targeted ? { outputs: [body.intervention.stateKey] } : {}),
    });

    if (report.status === 'BLOCKED' || report.status === 'BYPASSED') {
      return reply.code(422).send({
        error: 'gate refused this counterfactual',
        gateReport: report,
      });
    }

    try {
      const result = branch({
        mode: body.mode,
        options: { seed: BigInt(body.seed), modules: sandboxModules() },
        forkTick: body.forkTick,
        ticks: body.ticks,
        intervention: {
          stateKey: body.intervention.stateKey,
          value: Fx.parse(body.intervention.value),
          rationale: body.intervention.rationale,
        },
      });

      return reply.code(200).send({
        // Locked invariant #8: the mark travels with the payload, not just the UI.
        ...(result.watermarkRequired ? { watermark: SANDBOX_WATERMARK } : {}),
        mode: result.mode,
        forkTick: result.forkTick,
        parentHash: result.parentHash,
        branchHash: result.branchHash,
        // Fixed is a bigint underneath and JSON cannot serialize one. Decimal
        // strings cross the wire; the client parses them back exactly.
        divergence: divergenceTimeline(result.parent, result.child)
          .slice(0, 50)
          .map((d) => ({
            stateKey: d.stateKey,
            tick: d.tick,
            moduleId: d.moduleId,
            parentValue: d.parentValue,
            branchValue: d.branchValue,
            because: d.because.map((f) => ({
              key: f.key,
              provenance: f.provenance,
              contribution: Fx.toString(f.contribution),
            })),
          })),
      });
    } catch (error) {
      if (error instanceof RigorUnavailable) {
        return reply.code(422).send({ error: error.message });
      }
      if (error instanceof Error && /changes nothing|unknown key/.test(error.message)) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }
  });
}
