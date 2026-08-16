// The butterfly effect: the causal cascade following a divergence.
//
// The ripple answers "how far out did it reach". This answers "what caused
// what", which is a different question and the one people actually ask.
//
// Every node is derived: the lever is read from the scenario, the direct and
// knock-on effects from measured state differences, and the ordering from the
// fixed module execution order — which is genuinely a causal ordering, because
// agriculture runs before demography and demography before economy, so a
// difference appearing in that sequence is propagation and not coincidence.
//
// What this is not: a story. No edge is asserted that is not backed by both
// endpoints having moved. Where the model's own behaviour explains a node — a
// population rebound is Malthusian, not mysterious — the node says so and is
// tagged as model behaviour rather than as a finding.

import { yearOf } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import { DIMENSIONS, type Dimension } from './dimensions.js';
import type { EvidenceClass } from './evidence.js';

export type CascadeStage =
  | 'lever'
  | 'direct'
  | 'knock-on'
  | 'cross-region'
  | 'long-range'
  | 'model-limit';

export interface ButterflyNode {
  readonly id: string;
  readonly stage: CascadeStage;
  readonly title: string;
  readonly detail: string;
  readonly evidence: EvidenceClass;
  /** Year the difference first shows here, when there is one. */
  readonly year: number | null;
  /** For the Inspector: the state key and region this node is about. */
  readonly stateKey: string | null;
  readonly region: string | null;
  readonly parents: readonly string[];
}

export interface Butterfly {
  readonly nodes: readonly ButterflyNode[];
  readonly derivedFrom: 'state differences and module order';
}

const at = (t: SampleTable, region: string, key: string, i: number): number =>
  t.values.get(`${region}:${key}`)?.[i] ?? 0;

/** First sampled index where this dimension differs anywhere in the given set. */
function firstMove(
  alternate: SampleTable,
  baseline: SampleTable,
  dimension: Dimension,
  regions: readonly string[],
): { index: number; region: string } | undefined {
  const n = Math.min(alternate.ticks.length, baseline.ticks.length);
  for (let i = 0; i < n; i += 1) {
    for (const region of regions) {
      if (at(alternate, region, dimension.key, i) !== at(baseline, region, dimension.key, i)) {
        return { index: i, region };
      }
    }
  }
  return undefined;
}

function magnitude(
  alternate: SampleTable,
  baseline: SampleTable,
  dimension: Dimension,
  regions: readonly string[],
  index: number,
): number {
  let total = 0;
  for (const region of regions) {
    const a = at(alternate, region, dimension.key, index);
    const b = at(baseline, region, dimension.key, index);
    total += Math.abs(a - b) / (dimension.bounded ? 1 : dimension.scale);
  }
  return regions.length === 0 ? 0 : total / regions.length;
}

const direction = (a: number, b: number): string =>
  a > b ? 'rises' : a < b ? 'falls' : 'holds';

/**
 * Builds the cascade.
 *
 * `changedParams` names what the lever touched, which is how a moved dimension
 * is classified as direct rather than knock-on: a subsystem whose parameters
 * were edited moved because it was edited; one whose were not moved because
 * something upstream did.
 */
export function butterfly(
  alternate: SampleTable,
  baseline: SampleTable,
  touched: readonly string[],
  changedParams: readonly string[],
  divergenceYear: number,
  reading: string,
): Butterfly {
  const last = Math.min(alternate.ticks.length, baseline.ticks.length) - 1;
  const others = alternate.regions.filter((r) => !touched.includes(r));
  const editedSubsystems = new Set(
    changedParams.map((p) => p.split('.')[0] ?? '').filter((s) => s !== ''),
  );

  const nodes: ButterflyNode[] = [
    {
      id: 'lever',
      stage: 'lever',
      title: 'The lever',
      detail: reading,
      evidence: 'not-modelled',
      year: divergenceYear,
      stateKey: null,
      region: null,
      parents: [],
    },
  ];

  // Everything that moved, earliest first. The ordering is the causal claim:
  // module execution order is fixed, so a difference appearing downstream of
  // another is propagation rather than coincidence.
  const moved = DIMENSIONS.map((dimension) => ({
    dimension,
    first: firstMove(alternate, baseline, dimension, alternate.regions),
    size: magnitude(alternate, baseline, dimension, alternate.regions, last),
  }))
    .filter(
      (m): m is { dimension: Dimension; first: { index: number; region: string }; size: number } =>
        m.first !== undefined,
    )
    .sort((a, b) => a.first.index - b.first.index);

  const stageOf = (dimension: Dimension, region: string): CascadeStage =>
    editedSubsystems.has(dimension.subsystem)
      ? 'direct'
      : touched.includes(region)
        ? 'knock-on'
        : 'cross-region';

  for (const { dimension, first, size } of moved) {
    const { index, region } = first;
    const year = yearOf(alternate.ticks[index] as number);
    const stage = stageOf(dimension, region);
    const a = at(alternate, region, dimension.key, last);
    const b = at(baseline, region, dimension.key, last);

    // Up to two dimensions that moved before this one. A node with no parent
    // would be a dangling claim, so whatever moved first traces to the lever.
    const earlier = moved
      .filter((m) => m.first.index < index && m.dimension.key !== dimension.key)
      .slice(-2)
      .map((m) => `${stageOf(m.dimension, m.first.region)}:${m.dimension.key}`);

    nodes.push({
      id: `${stage}:${dimension.key}`,
      stage,
      title: dimension.label,
      detail:
        stage === 'direct'
          ? `${dimension.subsystem} was changed directly. ${dimension.label} ${direction(a, b)}.`
          : `${dimension.subsystem} was never touched. ${dimension.label} ${direction(a, b)} because something upstream moved.`,
      evidence: stage === 'direct' ? 'simulated' : 'knock-on',
      year,
      stateKey: dimension.key,
      region,
      parents: stage === 'direct' || earlier.length === 0 ? ['lever'] : earlier,
    });

    if (size > 0.02 && stage !== 'direct' && others.includes(region)) {
      nodes.push({
        id: `spread:${dimension.key}`,
        stage: 'cross-region',
        title: 'Reaches countries outside the intervention',
        detail: `${dimension.label} differs in ${region}, which the lever never touched.`,
        evidence: 'knock-on',
        year,
        stateKey: dimension.key,
        region,
        parents: [`${stage}:${dimension.key}`],
      });
    }
  }

  // Where the model's own behaviour is the explanation, say so rather than
  // letting a fading difference read as a finding.
  const population = moved.find((m) => m.dimension.key === 'demography.population');
  if (population !== undefined) {
    const peak = Math.max(
      ...alternate.ticks.map((_, i) =>
        magnitude(alternate, baseline, population.dimension, alternate.regions, i),
      ),
    );
    const ending = magnitude(alternate, baseline, population.dimension, alternate.regions, last);
    if (peak > 0 && ending < peak * 0.8) {
      nodes.push({
        id: 'model-limit:malthus',
        stage: 'model-limit',
        title: 'The population difference fades',
        detail:
          'Population sits at the carrying capacity the food supply allows, so mortality differences are made up within a generation. Only levers that move carrying capacity — yield, technology, trade, irrigation — hold a population difference to the endpoint. This is the model, not a finding about history.',
        evidence: 'interpretive',
        year: null,
        stateKey: 'demography.population',
        region: null,
        parents: [`${stageOf(population.dimension, population.first.region)}:demography.population`],
      });
    }
  }

  return { nodes, derivedFrom: 'state differences and module order' };
}

/** What the cascade cannot show, listed rather than left as an absence. */
export const BUTTERFLY_LIMITS: readonly string[] = [
  'Edges are ordering, not proof. Two things moving in module order is strong evidence of propagation and is not the factor ledger, which is off at world scale.',
  'Nothing here names a cause outside the sixteen sampled dimensions.',
];
