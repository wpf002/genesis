/**
 * @genesis/replay — seed + configHash + paramSetId -> byte-identical state, and
 * the export format that carries a run out of the system.
 *
 * Locked invariant #8: Sandbox output is watermarked everywhere it can leave the
 * system. A screenshot keeps the hatch because the UI draws it; a file has no
 * pixels, so the mark has to be in the bytes. `exportRun` puts it there and
 * there is no parameter to turn it off.
 */

import { Fx, type StateEntry } from '@genesis/kernel';
import type { Mode } from '@genesis/params';

export const REPLAY_VERSION = '0.1.0';

export interface ExportInput {
  readonly mode: Mode;
  readonly seed: bigint;
  readonly tick: number;
  readonly stateHash: string;
  readonly entries: readonly StateEntry[];
}

/** Prepended to every Sandbox export. Survives copy-paste, diff and grep. */
export const SANDBOX_WATERMARK = [
  '# SANDBOX OUTPUT — NOT A RESULT',
  '# Every parameter behind these numbers is INVENTED.',
  '# Genesis does not claim Sandbox output means anything.',
] as const;

export class UnmarkedExport extends Error {}

export function exportRun(input: ExportInput): string {
  const lines: string[] = [];

  if (input.mode === 'SANDBOX') lines.push(...SANDBOX_WATERMARK, '#');

  lines.push(
    `# genesis-replay ${REPLAY_VERSION}`,
    `# mode ${input.mode}`,
    `# seed ${input.seed.toString()}`,
    `# tick ${input.tick}`,
    `# stateHash ${input.stateHash}`,
    'key,value',
  );
  for (const entry of input.entries) {
    lines.push(`${entry.key},${Fx.toString(entry.value)}`);
  }

  const text = lines.join('\n') + '\n';

  // Belt and braces: the check runs on the produced bytes, so a future edit to
  // the assembly above cannot ship an unmarked Sandbox file.
  if (input.mode === 'SANDBOX' && !isWatermarked(text)) {
    throw new UnmarkedExport('refusing to emit an unmarked Sandbox export');
  }
  return text;
}

export function isWatermarked(text: string): boolean {
  return SANDBOX_WATERMARK.every((line) => text.includes(line));
}

export {
  branch,
  NarrativeClaimRefused,
  rigorInterval,
  type BranchRequest,
  type BranchResult,
  type Intervention,
  type Interval,
} from './branch.js';

export { divergenceTimeline, type Divergence } from './divergence.js';

export {
  baselineOf,
  canonicalConfig,
  configHash,
  MAX_TICKS,
  orderedInterventions,
  parseScenario,
  runScenario,
  SCENARIO_FORMAT,
  ScenarioInvalid,
  scenarioSchema,
  workUnits,
  type Scenario,
  type ScenarioIntervention,
  type ScenarioRun,
} from './scenario.js';

export {
  base64UrlDecode,
  base64UrlEncode,
  canonicalJson,
  decodePermalink,
  encodePermalink,
  PERMALINK_VERSION,
  PermalinkCorrupt,
  publish,
  reproduce,
  verifyPermalink,
  type PublishedRun,
  type Reproduction,
} from './permalink.js';

export { packById, SCENARIO_PACKS } from './packs.js';

export {
  chronicle,
  conditionFrames,
  formatYear,
  START_YEAR,
  yearOf,
  type Condition,
  type Frame,
  type Severity,
  type WorldEvent,
} from './chronicle.js';

export {
  HEADLINE_KEYS,
  headlineKeysFor,
  readSeries,
  type Sample,
  type Series,
} from './series.js';

export {
  SAMPLED_KEYS,
  sampleWorld,
  tableFromRun,
  yearsOf,
  type SampledKey,
  type SampledRun,
  type SampleRequest,
  type SampleTable,
} from './world.js';

export {
  CATALOGUE,
  ERAS,
  entryById,
  type CatalogueEntry,
  type Era,
} from './catalogue/entries.js';
export { type Lever, type Shock } from './catalogue/levers.js';
export {
  LAST_OBSERVED_YEAR,
  SPAN_TICKS,
  runBaseline,
  runCounterfactual,
  tickOfYear,
  type CounterfactualRun,
} from './catalogue/engine.js';
export {
  expand,
  type Confidence,
  type Expansion,
  type Finding,
  type Stage,
} from './catalogue/expansion.js';

export {
  DIMENSIONS,
  DIMENSION_KEYS,
  SUBSYSTEMS,
  dimensionOf,
  type Dimension,
} from './analysis/dimensions.js';
export {
  DISTANCE_METHOD,
  realityDistance,
  weightTable,
  type DistancePoint,
  type WeightRow,
} from './analysis/distance.js';
export {
  cascades,
  convergence,
  firstDifference,
  ripple,
  spread,
  type CascadeEvent,
  type Convergence,
  type FirstDifference,
  type RegionArrival,
  type Ripple,
  type RippleRing,
} from './analysis/difference.js';
export {
  DNA_NOT_MODELLED,
  realityDna,
  type DnaAxis,
  type RealityDna,
} from './analysis/dna.js';
export {
  EVIDENCE,
  EVIDENCE_ORDER,
  NOT_A_PROBABILITY,
  REPRESENTABILITY,
  SUPPORT,
  type EvidenceClass,
  type Representability,
  type Support,
} from './analysis/evidence.js';
export {
  FIT_CAVEAT,
  HISTORICAL_EVENTS,
  SOURCES,
  WORLD_POPULATION,
  eventsNear,
  modelAgainstRecord,
  sourceOf,
  type FitPoint,
  type HistoricalEvent,
  type Observation,
  type Source,
} from './history/observations.js';

export {
  BranchInvalid,
  assertBranchValid,
  fork,
  runBranch,
  type Branch,
  type BranchRun,
  type BranchRunRequest,
  type Phase,
} from './branching/branch.js';
export {
  ARCHETYPES,
  SUGGESTION_CAVEAT,
  archetypeById,
  preview,
  suggest,
  type Archetype,
  type Draft,
  type DraftPreview,
  type Suggestion,
} from './branching/translate.js';
export { scenarioPhaseSchema, type ScenarioPhase } from './scenario.js';
