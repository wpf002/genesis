/// <reference lib="webworker" />
//
// The full-world run is 177 countries over 5100 years — about 900,000
// tick-regions and twelve seconds of solid arithmetic. On the main thread that
// is twelve seconds of frozen page, so it happens here and reports progress on
// the way.
//
// The worker returns frames and events, not the run: shipping the state back
// would cost more than computing it.

import { Run, type RunOptions } from '@genesis/kernel';
import { SandboxParams, sandboxModules, worldModules } from '@genesis/models';
import {
  baselineOf,
  chronicle,
  conditionFrames,
  orderedInterventions,
  sampleWorld,
  type Frame,
  type Scenario,
  type WorldEvent,
} from '@genesis/replay';
import { Fx } from '@genesis/kernel';

export interface WorldRequest {
  readonly scenario: Scenario;
  /** Run the untouched baseline too, for the side-by-side. */
  readonly withBaseline: boolean;
}

export interface WorldResult {
  readonly kind: 'done';
  readonly frames: readonly Frame[];
  readonly baselineFrames: readonly Frame[] | null;
  readonly events: readonly WorldEvent[];
  readonly baselineEvents: readonly WorldEvent[];
  readonly terminalHash: string;
  readonly identical: boolean;
  readonly elapsedMs: number;
}

export type WorldMessage =
  | { kind: 'progress'; fraction: number; phase: string }
  | WorldResult
  | { kind: 'error'; message: string };

function modulesFor(scenario: Scenario, params: SandboxParams) {
  return scenario.regions.length === 0
    ? sandboxModules(params)
    : worldModules(params, scenario.regions);
}

function optionsFor(scenario: Scenario): RunOptions {
  const params = new SandboxParams(scenario.overrides);
  return { seed: BigInt(scenario.seed), modules: modulesFor(scenario, params) };
}

function runOne(
  scenario: Scenario,
  phase: string,
  report: (fraction: number, phase: string) => void,
) {
  const regions = scenario.regions.length === 0 ? [''] : scenario.regions;

  // Interventions need the run stepped by hand, so they are applied against a
  // plain Run and the sampled path is only used when there are none.
  if (scenario.interventions.length > 0) {
    const run = new Run({ ...optionsFor(scenario), ledger: 'full' });
    for (const intervention of orderedInterventions(scenario)) {
      run.advanceTo(intervention.tick);
      const before = run.get(intervention.stateKey);
      const value = Fx.parse(intervention.value);
      run.override(intervention.stateKey, value, {
        key: 'scenario.intervention',
        provenance: 'INVENTED',
        contribution: Fx.sub(value, before),
      });
    }
    run.advanceTo(scenario.ticks);
    report(1, phase);
    // tableFromRun is imported lazily to keep the hot path above free of it.
    return { run, regions };
  }
  return { run: null, regions };
}

self.onmessage = async (event: MessageEvent<WorldRequest>) => {
  const started = Date.now();
  const { scenario, withBaseline } = event.data;
  const post = (message: WorldMessage) => self.postMessage(message);

  try {
    const regions = scenario.regions.length === 0 ? [''] : scenario.regions;
    const every = Math.max(1, Math.ceil(scenario.ticks / 400));

    const { tableFromRun } = await import('@genesis/replay');

    const tableFor = (target: Scenario, phase: string, offset: number, span: number) => {
      const withInterventions = runOne(target, phase, (f) =>
        post({ kind: 'progress', fraction: offset + f * span, phase }),
      );
      if (withInterventions.run !== null) {
        return {
          table: tableFromRun(withInterventions.run, regions),
          terminalHash: withInterventions.run.stateHash(),
        };
      }
      const sampled = sampleWorld({
        options: optionsFor(target),
        ticks: target.ticks,
        regions,
        every,
        onProgress: (f) => post({ kind: 'progress', fraction: offset + f * span, phase }),
      });
      return { table: sampled.table, terminalHash: sampled.terminalHash };
    };

    const span = withBaseline ? 0.5 : 1;
    const main = tableFor(scenario, 'Running this timeline', 0, span);
    const base = withBaseline
      ? tableFor(baselineOf(scenario), 'Running the baseline', 0.5, 0.5)
      : main;

    post({
      kind: 'done',
      frames: conditionFrames(main.table),
      baselineFrames: withBaseline ? conditionFrames(base.table) : null,
      events: chronicle(main.table),
      baselineEvents: withBaseline ? chronicle(base.table) : [],
      terminalHash: main.terminalHash,
      identical: main.terminalHash === base.terminalHash,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    post({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
