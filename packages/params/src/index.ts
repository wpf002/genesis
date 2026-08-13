/**
 * @genesis/params — parameter registry and provenance gate.
 *
 * Phase 0 defines only the provenance vocabulary, which is the one thing the
 * rest of the tree is allowed to depend on before Phase 2. The registry,
 * dependency tracking and GateCheck land in Phase 2.
 */

/**
 * Provenance is a required field on every parameter. There is no default, and
 * there is no fourth tag. Mirrors the `Provenance` enum in the Prisma schema.
 */
export const PROVENANCE = ['CALIBRATED', 'ESTIMATED', 'INVENTED'] as const;

export type Provenance = (typeof PROVENANCE)[number];

/** Run modes. Mirrors the `Mode` enum in the Prisma schema. */
export const MODE = ['RIGOR', 'SANDBOX'] as const;

export type Mode = (typeof MODE)[number];

/**
 * The boundary, stated once: a Rigor run may not emit an output whose
 * dependency path touches an INVENTED parameter.
 */
export function isAdmissibleInRigor(provenance: Provenance): boolean {
  return provenance !== 'INVENTED';
}

/** Bumped when the registry and GateCheck land. Read by bin/gate-check.ts. */
export const PHASE = 0 as const;
