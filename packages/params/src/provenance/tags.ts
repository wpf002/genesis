// The provenance vocabulary. Mirrors the Prisma enums in @genesis/schema.

export const PROVENANCE = ['CALIBRATED', 'ESTIMATED', 'INVENTED'] as const;
export type Provenance = (typeof PROVENANCE)[number];

export const MODE = ['RIGOR', 'SANDBOX'] as const;
export type Mode = (typeof MODE)[number];

/** A Rigor run may not emit an output whose dependency path touches INVENTED. */
export function isAdmissibleInRigor(provenance: Provenance): boolean {
  return provenance !== 'INVENTED';
}
