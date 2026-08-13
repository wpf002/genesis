/**
 * @genesis/kernel — the deterministic simulation core.
 *
 * Phase 0 is infrastructure only. Nothing in this package may:
 *   - import a domain model (dependency direction is models -> kernel, never back)
 *   - read the wall clock, the locale, or the environment
 *   - use Math.random, or any randomness not drawn from the kernel's seeded stream
 *   - hold a float in simulation state
 *
 * The first three are enforced by lint (see eslint.config.mjs); the fourth is
 * enforced by the Fixed type once it lands in Phase 1.
 *
 * Phase 1 fills in: rng/ (xoshiro128**), ledger/ (Factor[]), tick/ (the loop),
 * state/ (store + snapshot + stateHash).
 */

export const KERNEL_VERSION = '0.0.0';

/** Phase 1 replaces this with the real fixed-point scale constant. */
export const PHASE = 0 as const;
