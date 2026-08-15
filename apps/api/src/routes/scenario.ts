// The public scenario API.
//
// The Phase 8 exit gate: GET /scenario/:token runs the scenario the token
// carries and reports the terminal hash. Nothing about that path reads a
// database, so a third party with the token and a checkout gets the same answer
// this server does.
//
// Submission is open, so the work a request can ask for is capped here. The
// scenario format allows a long run; this endpoint does not have to serve one.

import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  decodePermalink,
  parseScenario,
  PermalinkCorrupt,
  publish,
  reproduce,
  SANDBOX_WATERMARK,
  SCENARIO_PACKS,
  ScenarioInvalid,
  verifyPermalink,
  type PublishedRun,
  type Scenario,
} from '@genesis/replay';
import { RigorUnavailable } from '@genesis/params';
import { z } from 'zod';

/** ticks x regions. A submitted run may not cost more than this. */
const MAX_WORK_UNITS = 20_000;

function workUnits(scenario: Scenario): number {
  return scenario.ticks * Math.max(1, scenario.regions.length);
}

/** Locked invariant #8: the mark travels with the payload, not just the UI. */
function withWatermark(published: PublishedRun): Record<string, unknown> {
  return {
    ...(published.watermarkRequired ? { watermark: SANDBOX_WATERMARK } : {}),
    ...published,
  };
}

const verifySchema = z.object({
  token: z.string().min(1),
  terminalHash: z.string().regex(/^[0-9a-f]{64}$/, 'terminalHash must be 64 hex characters'),
});

export async function scenarioRoutes(app: FastifyInstance) {
  // Packs are fixed at build time, so their hashes are computed once and reused.
  let packCache: readonly Record<string, unknown>[] | undefined;

  app.get('/packs', async () => {
    packCache ??= SCENARIO_PACKS.map((pack) => ({
      ...withWatermark(publish(pack)),
      note: pack.note,
      ticks: pack.ticks,
      regions: pack.regions,
      overrides: pack.overrides,
      interventions: pack.interventions,
    }));
    return { packs: packCache };
  });

  app.post('/scenario', async (request, reply) => {
    let scenario: Scenario;
    try {
      scenario = parseScenario(request.body);
    } catch (error) {
      if (error instanceof ScenarioInvalid) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }

    const cost = workUnits(scenario);
    if (cost > MAX_WORK_UNITS) {
      return reply.code(413).send({
        error: `this run costs ${cost} tick-regions and the public limit is ${MAX_WORK_UNITS}. Run it locally from the permalink instead.`,
      });
    }

    return runOrExplain(scenario, () => publish(scenario), reply);
  });

  app.get<{ Params: { token: string } }>('/scenario/:token', async (request, reply) => {
    let scenario: Scenario;
    try {
      scenario = decodePermalink(request.params.token);
    } catch (error) {
      if (error instanceof PermalinkCorrupt || error instanceof ScenarioInvalid) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }

    const cost = workUnits(scenario);
    if (cost > MAX_WORK_UNITS) {
      return reply.code(413).send({
        error: `this run costs ${cost} tick-regions and the public limit is ${MAX_WORK_UNITS}. Run it locally from the permalink instead.`,
      });
    }

    return runOrExplain(scenario, () => reproduce(request.params.token), reply);
  });

  app.post('/scenario/verify', async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid request', issues: parsed.error.issues });
    }
    try {
      const result = verifyPermalink(parsed.data.token, parsed.data.terminalHash);
      // A mismatch is a real answer, not a failure. 200 with reproduced: false.
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof PermalinkCorrupt || error instanceof ScenarioInvalid) {
        return reply.code(400).send({ error: error.message });
      }
      if (error instanceof RigorUnavailable) {
        return reply.code(422).send({ error: error.message });
      }
      throw error;
    }
  });
}

function runOrExplain(
  scenario: Scenario,
  run: () => PublishedRun,
  reply: FastifyReply,
): unknown {
  try {
    return reply.code(200).send(withWatermark(run()));
  } catch (error) {
    // Rigor has no calibrated parameters, so a Rigor scenario is refused rather
    // than degraded. See ADR 0005.
    if (error instanceof RigorUnavailable) {
      return reply.code(422).send({ error: error.message, mode: scenario.mode });
    }
    if (error instanceof ScenarioInvalid) {
      return reply.code(400).send({ error: error.message });
    }
    throw error;
  }
}
