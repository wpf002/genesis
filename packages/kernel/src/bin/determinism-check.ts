/**
 * Determinism gate — Phase 1 exit criterion.
 *
 * Replays the same seed 1000 times and asserts byte-identical terminal state
 * hashes, then asserts that restore-from-snapshot at tick k and continue
 * produces the same terminal hash as an uninterrupted run.
 *
 * There is no kernel to replay yet, so this exits 0 with an explicit
 * NOT_IMPLEMENTED marker rather than pretending to have verified anything.
 * See docs/decisions/0001-phase-0-stubs.md.
 */

const REQUIRED_PHASE = 1;

import { PHASE } from '../index.js';

if (PHASE >= REQUIRED_PHASE) {
  console.error('determinism: kernel reports Phase >= 1 but the check is still a stub.');
  process.exit(1);
}

console.log('determinism: NOT_IMPLEMENTED — no kernel to replay (Phase 1).');
