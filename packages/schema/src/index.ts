/**
 * @genesis/schema — Prisma client and generated model types.
 *
 * The provenance invariant is enforced at the database level: ParamValue.provenance
 * is non-nullable and has no default. Adding a default is a schema-level violation
 * of locked invariant #3.
 */

export { PrismaClient, Prisma } from '@prisma/client';

export type {
  Branch,
  Event,
  Mode,
  ParamSet,
  ParamValue,
  Provenance,
  Run,
  Snapshot,
  ValidationResult,
} from '@prisma/client';
