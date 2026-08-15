/// <reference lib="webworker" />
//
// One counterfactual: the world that happened and the world that did not, run
// side by side. The baseline is identical for every scenario at the same seed
// and region set, so it is computed once and kept.

import {
  chronicle,
  conditionFrames,
  entryById,
  expand,
  runBaseline,
  runCounterfactual,
  type Expansion,
  type Frame,
  type WorldEvent,
} from '@genesis/replay';

export interface CounterfactualRequest {
  readonly entryId: string;
  readonly regions: readonly string[];
  readonly ticks: number;
}

export interface CounterfactualResult {
  readonly kind: 'done';
  readonly frames: readonly Frame[];
  readonly baselineFrames: readonly Frame[];
  readonly events: readonly WorldEvent[];
  readonly expansion: Expansion;
  readonly divergenceTick: number;
  readonly elapsedMs: number;
}

export type CounterfactualMessage =
  | { kind: 'progress'; fraction: number; phase: string }
  | CounterfactualResult
  | { kind: 'error'; message: string };

/** Keyed by seed/regions/ticks, which is everything the baseline depends on. */
let cached: { key: string; run: ReturnType<typeof runBaseline> } | undefined;

self.onmessage = (event: MessageEvent<CounterfactualRequest>) => {
  const started = Date.now();
  const post = (message: CounterfactualMessage) => self.postMessage(message);
  const { entryId, regions, ticks } = event.data;

  try {
    const entry = entryById(entryId);
    if (entry === undefined) throw new Error(`no scenario called ${entryId}`);

    const key = `1|${regions.join(',')}|${ticks}`;
    if (cached?.key !== key) {
      cached = {
        key,
        run: runBaseline(1n, regions, ticks, 12, (f) =>
          post({ kind: 'progress', fraction: f * 0.5, phase: 'Running the world that happened' }),
        ),
      };
    } else {
      post({ kind: 'progress', fraction: 0.5, phase: 'Reusing the world that happened' });
    }
    const base = cached.run;

    const counter = runCounterfactual({
      entry,
      regions,
      ticks,
      every: 12,
      onProgress: (f) =>
        post({ kind: 'progress', fraction: 0.5 + f * 0.5, phase: 'Running the world that did not' }),
    });

    post({
      kind: 'done',
      frames: conditionFrames(counter.table),
      baselineFrames: conditionFrames(base.table),
      events: chronicle(counter.table),
      expansion: expand(entry, counter.table, base.table, counter.touched),
      divergenceTick: counter.divergenceTick,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    post({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
