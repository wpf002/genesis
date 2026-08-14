// Resolving a Sandbox constant to a Fixed value.
//
// A subsystem cannot reach for a number that nobody declared. `resolve` looks the
// key up in the registry first and throws if it is missing, so adding a constant
// to a subsystem without registering it fails at construction rather than
// producing an unlabelled number at tick 4000.

import { Fx, type Factor, type Fixed } from '@genesis/kernel';
import { ParamRegistry, SANDBOX_PARAMS } from '@genesis/params';
import { SANDBOX_VALUES } from './values.js';

export class SandboxParams {
  private readonly registry = new ParamRegistry();
  private readonly cache = new Map<string, Fixed>();

  constructor() {
    this.registry.registerAll(SANDBOX_PARAMS);
  }

  /** Throws if the key is unregistered or has no value. */
  get(key: string): Fixed {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const declared = this.registry.get(key);
    if (declared === undefined) {
      throw new Error(
        `sandbox: ${key} is not registered. Declare it in @genesis/params before using it.`,
      );
    }
    const raw = SANDBOX_VALUES[key];
    if (raw === undefined) {
      throw new Error(`sandbox: ${key} is declared but has no value in SANDBOX_VALUES`);
    }
    const value = Fx.parse(raw);
    this.cache.set(key, value);
    return value;
  }

  /** A factor carrying this parameter's declared provenance, never a guess at it. */
  factor(key: string, contribution: Fixed): Factor {
    const declared = this.registry.require(key);
    return { key, provenance: declared.provenance, contribution };
  }

  /** Every declared key that has no value yet. Used by the Phase 5 gate test. */
  missingValues(): readonly string[] {
    return this.registry
      .all()
      .map((decl) => decl.key)
      .filter((key) => SANDBOX_VALUES[key] === undefined);
  }

  /** Every value with no declaration. Should always be empty. */
  undeclaredValues(): readonly string[] {
    const declared = new Set(this.registry.all().map((decl) => decl.key));
    return Object.keys(SANDBOX_VALUES).filter((key) => !declared.has(key));
  }
}
