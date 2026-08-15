// The scenario format: everything needed to reproduce a run, and nothing else.
//
// A scenario is initial conditions (seed, region set), a parameter set (the
// registered Sandbox values plus declared overrides) and a list of interventions.
// Locked invariant #5 says seed + configHash + paramSetId determines the terminal
// state hash, so those three are computed here and travel with every published
// run.
//
// Title and note are not hashed. They describe a run; they do not determine one.
// Changing the title of a published scenario has to leave the config hash alone,
// or a permalink stops meaning "this exact run".

import { blake3Hex, Fx, Run, type Fixed } from '@genesis/kernel';
import { assertRigorRunnable } from '@genesis/params';
import {
  OverrideRejected,
  REGIONS,
  SandboxParams,
  sandboxModules,
  worldModules,
} from '@genesis/models';
import { z } from 'zod';

export const SCENARIO_FORMAT = 'genesis-scenario/1';

/** A run may not be longer than this. Guards the public API, not the kernel. */
export const MAX_TICKS = 20_000;

const DECIMAL = /^-?\d+(\.\d+)?$/;

export const scenarioInterventionSchema = z.object({
  /** Applied at the end of this tick, before the run continues. */
  tick: z.number().int().positive(),
  stateKey: z.string().min(1),
  value: z.string().regex(DECIMAL, 'value must be an exact decimal'),
  rationale: z.string().min(1, 'an intervention without a rationale is a guess'),
});

export type ScenarioIntervention = z.infer<typeof scenarioInterventionSchema>;

export const scenarioSchema = z
  .object({
    format: z.literal(SCENARIO_FORMAT),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be lowercase kebab-case'),
    title: z.string().min(1),
    note: z.string().default(''),
    mode: z.enum(['RIGOR', 'SANDBOX']),
    /** Decimal digits. Kept as a string because JSON has no bigint. */
    seed: z.string().regex(/^\d+$/),
    ticks: z.number().int().positive().max(MAX_TICKS),
    /** Empty means the flat single-region run. Order is module execution order. */
    regions: z.array(z.string()).default([]),
    overrides: z.record(z.string(), z.string().regex(DECIMAL)).default({}),
    interventions: z.array(scenarioInterventionSchema).default([]),
  })
  .superRefine((scenario, ctx) => {
    const seen = new Set<string>();
    for (const region of scenario.regions) {
      if (!REGIONS.includes(region)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['regions'],
          message: `unknown region ${region}; known regions are ${REGIONS.join(', ')}`,
        });
      }
      if (seen.has(region)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['regions'],
          message: `region ${region} appears twice`,
        });
      }
      seen.add(region);
    }

    const slots = new Set<string>();
    for (const intervention of scenario.interventions) {
      if (intervention.tick >= scenario.ticks) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interventions'],
          message: `intervention at tick ${intervention.tick} is at or after the run's end (${scenario.ticks})`,
        });
      }
      // Two writes to one key on one tick have no defined order, so the format
      // refuses them rather than picking a winner.
      const slot = `${intervention.tick}:${intervention.stateKey}`;
      if (slots.has(slot)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interventions'],
          message: `two interventions target ${intervention.stateKey} at tick ${intervention.tick}`,
        });
      }
      slots.add(slot);
    }
  });

export type Scenario = z.infer<typeof scenarioSchema>;

export class ScenarioInvalid extends Error {}

export function parseScenario(input: unknown): Scenario {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new ScenarioInvalid(`scenario: ${detail}`);
  }
  return parsed.data;
}

/**
 * The same run with nothing touched: no overrides, no interventions. Used to ask
 * whether a scenario actually changed anything.
 *
 * It is worth asking. An intervention on a state key whose owning module
 * recomputes it from scratch each tick - and runs before every reader of it - is
 * erased before anything sees it, and the scenario reproduces the baseline hash
 * while looking like it did something. `disease_spatial.importPressure` behaves
 * exactly like this. The packs test compares against this baseline so that class
 * of no-op fails the build instead of shipping.
 */
export function baselineOf(scenario: Scenario): Scenario {
  return { ...scenario, overrides: {}, interventions: [] };
}

/** Interventions in the order they are applied: by tick, then by key. */
export function orderedInterventions(
  scenario: Scenario,
): readonly ScenarioIntervention[] {
  return [...scenario.interventions].sort(
    (a, b) => a.tick - b.tick || (a.stateKey < b.stateKey ? -1 : a.stateKey > b.stateKey ? 1 : 0),
  );
}

/**
 * The bytes the config hash is taken over. Deliberately printable: if two people
 * disagree about whether they ran the same scenario, they can diff this.
 */
export function canonicalConfig(scenario: Scenario): string {
  const lines = [
    scenario.format,
    `mode ${scenario.mode}`,
    `seed ${scenario.seed}`,
    `ticks ${scenario.ticks}`,
    `regions ${scenario.regions.join(',')}`,
  ];
  for (const key of Object.keys(scenario.overrides).sort()) {
    lines.push(`override ${key}=${scenario.overrides[key] as string}`);
  }
  for (const intervention of orderedInterventions(scenario)) {
    lines.push(
      `intervention ${intervention.tick} ${intervention.stateKey}=${intervention.value}`,
    );
  }
  return lines.join('\n') + '\n';
}

export function configHash(scenario: Scenario): string {
  return blake3Hex(new TextEncoder().encode(canonicalConfig(scenario)));
}

export interface ScenarioRun {
  readonly scenario: Scenario;
  readonly configHash: string;
  readonly paramSetId: string;
  readonly terminalHash: string;
  readonly tick: number;
  readonly run: Run;
  readonly watermarkRequired: boolean;
}

/**
 * Runs a scenario start to finish. Interventions land through `Run.override`, so
 * each one is in the ledger and a divergence can be attributed to it rather than
 * to drift.
 */
export function runScenario(scenario: Scenario): ScenarioRun {
  // Rigor has no calibrated parameters, so a Rigor scenario cannot run at all.
  // See ADR 0005.
  if (scenario.mode === 'RIGOR') assertRigorRunnable();

  // An override the registry refuses is a bad scenario, not a server fault, so
  // it comes back as ScenarioInvalid like every other way of writing one wrong.
  let params: SandboxParams;
  try {
    params = new SandboxParams(scenario.overrides);
  } catch (error) {
    if (error instanceof OverrideRejected) throw new ScenarioInvalid(error.message);
    throw error;
  }

  const modules =
    scenario.regions.length === 0
      ? sandboxModules(params)
      : worldModules(params, scenario.regions);

  const run = new Run({ seed: BigInt(scenario.seed), modules });

  for (const intervention of orderedInterventions(scenario)) {
    run.advanceTo(intervention.tick);
    let before: Fixed;
    try {
      before = run.get(intervention.stateKey);
    } catch {
      throw new ScenarioInvalid(
        `scenario: no state key ${intervention.stateKey} in this run`,
      );
    }
    const value: Fixed = Fx.parse(intervention.value);
    if (Fx.cmp(before, value) === 0) {
      throw new ScenarioInvalid(
        `scenario: intervention on ${intervention.stateKey} at tick ${intervention.tick} changes nothing`,
      );
    }
    run.override(intervention.stateKey, value, {
      key: 'scenario.intervention',
      provenance: 'INVENTED',
      contribution: Fx.sub(value, before),
    });
  }

  run.advanceTo(scenario.ticks);

  return {
    scenario,
    configHash: configHash(scenario),
    paramSetId: params.paramSetId(),
    terminalHash: run.stateHash(),
    tick: run.tick,
    run,
    watermarkRequired: scenario.mode !== 'RIGOR',
  };
}
