// The parameter registry.
//
// Provenance is a required field with no default (locked invariant #3), and the
// schema goes further: each tag must ship what the README says it ships with.
// CALIBRATED and ESTIMATED need a source; INVENTED needs a note saying why the
// number was chosen. An unjustified guess cannot be registered at all.

import { z } from 'zod';
import { Fx } from '@genesis/kernel';
import { PROVENANCE, type Provenance } from '../provenance/tags.js';

const KEY_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

const boundsSchema = z.object({
  /** Decimal strings, parsed exactly. Never floats. */
  min: z.string(),
  max: z.string(),
});

export const paramDeclSchema = z
  .object({
    key: z
      .string()
      .regex(KEY_PATTERN, 'key must be dotted lowercase, e.g. "agriculture.yield.tfp"'),
    unit: z.string().min(1),
    provenance: z.enum(PROVENANCE),
    /** Citation for ESTIMATED, dataset reference for CALIBRATED. */
    source: z.string().min(1).optional(),
    /** Required for INVENTED: one line on why this number was chosen. */
    note: z.string().min(1).optional(),
    bounds: boundsSchema.optional(),
  })
  .superRefine((decl, ctx) => {
    if (decl.provenance === 'CALIBRATED' && decl.source === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source'],
        message: 'CALIBRATED requires a dataset reference',
      });
    }
    if (decl.provenance === 'ESTIMATED' && decl.source === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source'],
        message: 'ESTIMATED requires a citation',
      });
    }
    if (decl.provenance === 'INVENTED' && decl.note === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'INVENTED requires a note saying why this value was chosen',
      });
    }
    if (decl.bounds !== undefined) {
      try {
        if (Fx.cmp(Fx.parse(decl.bounds.min), Fx.parse(decl.bounds.max)) > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['bounds'],
            message: 'bounds.min must not exceed bounds.max',
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bounds'],
          message: 'bounds must be exact decimal strings',
        });
      }
    }
  });

export type ParamDecl = z.infer<typeof paramDeclSchema>;

export class ParamRegistry {
  private readonly params = new Map<string, ParamDecl>();
  /** Registration order. Iteration never comes from key order over an object. */
  private readonly order: string[] = [];

  register(input: unknown): ParamDecl {
    const decl = paramDeclSchema.parse(input);
    if (this.params.has(decl.key)) {
      throw new Error(`params: duplicate registration for ${decl.key}`);
    }
    this.params.set(decl.key, decl);
    this.order.push(decl.key);
    return decl;
  }

  registerAll(inputs: readonly unknown[]): void {
    for (const input of inputs) this.register(input);
  }

  has(key: string): boolean {
    return this.params.has(key);
  }

  get(key: string): ParamDecl | undefined {
    return this.params.get(key);
  }

  /** Throws rather than defaulting. There is no default provenance. */
  require(key: string): ParamDecl {
    const decl = this.params.get(key);
    if (decl === undefined) throw new Error(`params: ${key} is not registered`);
    return decl;
  }

  provenanceOf(key: string): Provenance {
    return this.require(key).provenance;
  }

  all(): readonly ParamDecl[] {
    return this.order.map((key) => this.params.get(key) as ParamDecl);
  }

  byProvenance(provenance: Provenance): readonly ParamDecl[] {
    return this.all().filter((decl) => decl.provenance === provenance);
  }

  get size(): number {
    return this.order.length;
  }
}
