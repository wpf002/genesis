// Rigor mode has no calibrated parameters. ADR 0005.
//
// This is deliberately an empty array rather than a missing file, so the absence
// is visible in the tree and a test can assert it. Phases 3 and 4 tested the two
// parameters the track was built around: one flips sign under preprocessing, the
// other loses to a constant. Neither earned the tag.
//
// Filling this in requires passing the Phase 4 battery including V-08, the
// baseline comparison. See docs/model-cards/phase4-calibration.md.

import type { ParamDecl } from './registry.js';

export const RIGOR_PARAMS: readonly ParamDecl[] = [];

export class RigorUnavailable extends Error {
  constructor(reason: string) {
    super(
      `Rigor mode has no model: ${reason}. See docs/decisions/0005-rigor-ships-empty.md ` +
        'and docs/model-cards/phase4-calibration.md.',
    );
    this.name = 'RigorUnavailable';
  }
}

/**
 * Call before starting a Rigor run. Throws while the track is empty.
 *
 * This is the enforcement half of ADR 0005: without it, "Rigor ships empty" is a
 * sentence in a document that a future endpoint can forget to read.
 */
export function assertRigorRunnable(
  params: readonly ParamDecl[] = RIGOR_PARAMS,
): void {
  if (params.length === 0) {
    throw new RigorUnavailable('no calibrated parameters are registered');
  }
  const uncalibrated = params.filter((decl) => decl.provenance !== 'CALIBRATED');
  if (uncalibrated.length > 0) {
    throw new RigorUnavailable(
      `${uncalibrated.map((d) => d.key).join(', ')} are not CALIBRATED`,
    );
  }
}
