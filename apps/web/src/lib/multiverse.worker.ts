/// <reference lib="webworker" />
//
// Runs a set of branches against one shared baseline and returns only what a
// comparison needs. Three to five worlds is the working range; the baseline is
// computed once and reused, so N branches cost N runs and not 2N.

import {
  DIMENSIONS,
  conditionFrames,
  convergence,
  firstDifference,
  realityDistance,
  runBaseline,
  runBranch,
  type Branch,
  type Convergence,
  type DistancePoint,
  type Frame,
  type SampleTable,
} from '@genesis/replay';

export interface MultiverseRequest {
  readonly branches: readonly Branch[];
  readonly regions: readonly string[];
  readonly ticks: number;
}

export interface BranchSummary {
  readonly id: string;
  readonly label: string;
  readonly phaseTicks: readonly number[];
  readonly terminalHash: string;
  readonly changedParams: readonly string[];
  readonly distance: readonly DistancePoint[];
  readonly convergence: Convergence | undefined;
  readonly firstDifferenceYear: number | null;
  /** World mean per dimension per sampled tick, for DNA and sparklines. */
  readonly dna: readonly (readonly number[])[];
  readonly frames: readonly Frame[];
  readonly finalPopulation: number;
}

export interface MultiverseResult {
  readonly kind: 'done';
  readonly ticks: readonly number[];
  readonly labels: readonly string[];
  readonly baseline: BranchSummary;
  readonly branches: readonly BranchSummary[];
  readonly elapsedMs: number;
}

export type MultiverseMessage =
  | { kind: 'progress'; fraction: number; phase: string }
  | MultiverseResult
  | { kind: 'error'; message: string };

function dnaOf(table: SampleTable, keys: readonly string[]): (readonly number[])[] {
  return table.ticks.map((_, i) =>
    keys.map((key) => {
      if (table.regions.length === 0) return 0;
      let sum = 0;
      for (const region of table.regions) sum += table.values.get(`${region}:${key}`)?.[i] ?? 0;
      return sum / table.regions.length;
    }),
  );
}

function populationAt(table: SampleTable, index: number): number {
  let sum = 0;
  for (const region of table.regions) {
    sum += table.values.get(`${region}:demography.population`)?.[index] ?? 0;
  }
  return sum;
}

self.onmessage = (event: MessageEvent<MultiverseRequest>) => {
  const started = Date.now();
  const post = (message: MultiverseMessage) => self.postMessage(message);
  const { branches, regions, ticks } = event.data;

  try {
    const keys = DIMENSIONS.map((d) => d.key);
    const total = branches.length + 1;

    const base = runBaseline(1n, regions, ticks, 12, (f) =>
      post({ kind: 'progress', fraction: (f / total) * 1, phase: 'The world that happened' }),
    );

    const summarise = (
      id: string,
      label: string,
      table: SampleTable,
      terminalHash: string,
      phaseTicks: readonly number[],
      changedParams: readonly string[],
    ): BranchSummary => {
      const distance = realityDistance(table, base.table);
      const split = firstDifference(table, base.table);
      return {
        id,
        label,
        phaseTicks,
        terminalHash,
        changedParams,
        distance,
        convergence: convergence(distance),
        firstDifferenceYear: split?.year ?? null,
        dna: dnaOf(table, keys),
        frames: conditionFrames(table, 90),
        finalPopulation: populationAt(table, table.ticks.length - 1),
      };
    };

    const summaries: BranchSummary[] = [];
    branches.forEach((branch, i) => {
      const run = runBranch({
        branch,
        regions,
        ticks,
        every: 12,
        onProgress: (f) =>
          post({
            kind: 'progress',
            fraction: (1 + i + f) / total,
            phase: `Running ${branch.label}`,
          }),
      });
      summaries.push(
        summarise(branch.id, branch.label, run.table, run.terminalHash, run.phaseTicks, run.changedParams),
      );
    });

    post({
      kind: 'done',
      ticks: base.table.ticks,
      labels: DIMENSIONS.map((d) => d.label),
      baseline: summarise('baseline', 'Baseline', base.table, base.terminalHash, [], []),
      branches: summaries,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    post({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
