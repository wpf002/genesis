// Counterfactual branching.
//
// A branch is a snapshot plus a declared intervention. The parent is not
// mutated, and the branch carries the fork tick so a divergence can always be
// attributed to the intervention rather than to drift.
//
// The hard product rule from the roadmap lives here: Rigor branches emit an
// interval over simulated quantities and never a probability. There is no
// reference class for "probability the Industrial Revolution happens before
// 1800", so the type has nowhere to put one.

import { Fx, Run, type Fixed, type RunOptions } from '@genesis/kernel';
import { assertRigorRunnable, type Mode } from '@genesis/params';

export interface Intervention {
  /** Fully-qualified state key, e.g. "CHN:demography.population". */
  readonly stateKey: string;
  readonly value: Fixed;
  /** Why this intervention is being run. Required; a branch without one is a guess. */
  readonly rationale: string;
}

export interface BranchRequest {
  readonly mode: Mode;
  readonly options: RunOptions;
  readonly forkTick: number;
  readonly ticks: number;
  readonly intervention: Intervention;
}

/** A Rigor result is an interval. There is deliberately no `probability`. */
export interface Interval {
  readonly stateKey: string;
  readonly low: Fixed;
  readonly high: Fixed;
}

export interface BranchResult {
  readonly mode: Mode;
  readonly forkTick: number;
  readonly parentHash: string;
  readonly branchHash: string;
  readonly diverged: readonly string[];
  readonly watermarkRequired: boolean;
}

export class NarrativeClaimRefused extends Error {}

export function branch(request: BranchRequest): BranchResult {
  // Rigor has no calibrated parameters, so a Rigor counterfactual cannot run at
  // all. This throws rather than returning an empty interval that reads as a
  // result. See ADR 0005.
  if (request.mode === 'RIGOR') assertRigorRunnable();

  const parent = new Run(request.options);
  parent.advanceTo(request.forkTick);
  const snapshot = parent.snapshot();
  parent.advanceTo(request.ticks);

  const child = new Run(request.options);
  child.restore(snapshot);

  // The intervention is applied through the store, so it lands in the same
  // canonical encoding the hash is taken over.
  const before = child.get(request.intervention.stateKey);
  if (Fx.cmp(before, request.intervention.value) === 0) {
    throw new Error(
      `branch: intervention on ${request.intervention.stateKey} changes nothing`,
    );
  }
  child.override(request.intervention.stateKey, request.intervention.value, {
    key: 'counterfactual.intervention',
    provenance: 'INVENTED',
    contribution: Fx.sub(request.intervention.value, before),
  });
  child.advanceTo(request.ticks);

  const parentEntries = new Map(parent.entries().map((e) => [e.key, e.value]));
  const diverged = child
    .entries()
    .filter((e) => Fx.cmp(parentEntries.get(e.key) ?? Fx.ZERO, e.value) !== 0)
    .map((e) => e.key);

  return {
    mode: request.mode,
    forkTick: request.forkTick,
    parentHash: parent.stateHash(),
    branchHash: child.stateHash(),
    diverged,
    watermarkRequired: request.mode !== 'RIGOR',
  };
}

/**
 * Rigor output is an interval over a simulated quantity, and nothing else.
 * Passing anything that reads as a likelihood is refused rather than ignored.
 */
export function rigorInterval(
  stateKey: string,
  samples: readonly Fixed[],
  claim?: string,
): Interval {
  if (claim !== undefined) {
    throw new NarrativeClaimRefused(
      'Rigor counterfactuals report intervals over simulated quantities. ' +
        'They do not attach narrative claims or probabilities to historical outcomes.',
    );
  }
  if (samples.length === 0) throw new Error('rigorInterval: no samples');
  let low = samples[0] as Fixed;
  let high = samples[0] as Fixed;
  for (const sample of samples) {
    if (Fx.cmp(sample, low) < 0) low = sample;
    if (Fx.cmp(sample, high) > 0) high = sample;
  }
  return { stateKey, low, high };
}
