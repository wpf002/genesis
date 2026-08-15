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
