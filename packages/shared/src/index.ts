/**
 * @genesis/shared — types that cross the app boundary (api <-> web).
 *
 * Simulation types live in @genesis/kernel and @genesis/params. Only put
 * something here if both an app and another app need it.
 */

export type { Mode, Provenance } from '@genesis/params';

/** A single contributor to a state delta. The provenance inspector renders these. */
export interface Factor {
  /** Parameter key, e.g. "agriculture.yield.tfp_exponent". */
  readonly key: string;
  readonly provenance: 'CALIBRATED' | 'ESTIMATED' | 'INVENTED';
  /** Fixed-point contribution. Never a float. */
  readonly contribution: bigint;
}
