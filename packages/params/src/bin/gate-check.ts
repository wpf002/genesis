/**
 * Provenance gate — Phase 2 exit criterion.
 *
 * Walks every Rigor-declared output back through its parameter dependency path
 * and fails the build if any ancestor is INVENTED, naming the parameter and the
 * full path.
 *
 * There is no registry to walk yet, so this exits 0 with an explicit
 * NOT_IMPLEMENTED marker. It deliberately does NOT print PASS: a gate that
 * reports success before it can check anything is worse than no gate.
 * See docs/decisions/0001-phase-0-stubs.md.
 */

const REQUIRED_PHASE = 2;

import { PHASE } from '../index.js';

if (PHASE >= REQUIRED_PHASE) {
  console.error('gate: kernel reports Phase >= 2 but the gate is still a stub.');
  process.exit(1);
}

console.log('gate: NOT_IMPLEMENTED — no parameter registry to walk (Phase 2).');
