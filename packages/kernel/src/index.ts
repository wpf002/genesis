/**
 * @genesis/kernel — the deterministic simulation core.
 *
 * Nothing in this package may import a domain model, read the wall clock, use
 * randomness outside the seeded stream, or hold a float in state. The first
 * three are enforced by lint (eslint.config.mjs); the fourth by the Fixed type.
 */

export const KERNEL_VERSION = '0.2.0';

/**
 * Read by bin/determinism-check.ts. Bumping this past 1 while the determinism
 * check is still a stub fails the build on purpose.
 */
export const PHASE = 2 as const;

export { Fx, FIXED_DECIMALS, FIXED_SCALE, type Fixed } from './fixed.js';
export { Ledger, type Factor, type LedgerEntry, type Provenance } from './ledger/factor.js';
export { createRng, deriveStream, type Rng, type RngState } from './rng/xoshiro.js';
export { blake3, blake3Hex, toHex } from './state/blake3.js';
export {
  decodeSnapshot,
  encodeSnapshot,
  encodeState,
  SNAPSHOT_FORMAT,
  STATE_FORMAT,
  type SnapshotPayload,
  type StateEntry,
} from './state/encode.js';
export { StateStore } from './state/store.js';
export {
  Run,
  terminalHash,
  type RunOptions,
  type SimModule,
  type TickContext,
} from './tick/loop.js';
