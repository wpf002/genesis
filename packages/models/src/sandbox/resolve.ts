// Resolving a Sandbox constant to a Fixed value.
//
// A subsystem cannot reach for a number that nobody declared. `resolve` looks the
// key up in the registry first and throws if it is missing, so adding a constant
// to a subsystem without registering it fails at construction rather than
// producing an unlabelled number at tick 4000.

import { blake3Hex, Fx, type Factor, type Fixed } from '@genesis/kernel';
import { ParamRegistry, SANDBOX_PARAMS } from '@genesis/params';
import { SANDBOX_VALUES } from './values.js';

export class OverrideRejected extends Error {}

export class SandboxParams {
  private readonly registry = new ParamRegistry();
  private readonly cache = new Map<string, Fixed>();
  private readonly overrides: ReadonlyMap<string, string>;

  /**
   * Overrides are decimal strings keyed by registered parameter. A scenario can
   * change what a run does, but not what the registry knows about a number: an
   * unregistered key is refused, and a value outside declared bounds is refused.
   */
  constructor(overrides: Readonly<Record<string, string>> = {}) {
    this.registry.registerAll(SANDBOX_PARAMS);

    const map = new Map<string, string>();
    for (const key of Object.keys(overrides).sort()) {
      const raw = overrides[key] as string;
      const declared = this.registry.get(key);
      if (declared === undefined) {
        throw new OverrideRejected(
          `sandbox: cannot override ${key}, it is not a registered parameter`,
        );
      }
      let value: Fixed;
      try {
        value = Fx.parse(raw);
      } catch {
        throw new OverrideRejected(`sandbox: override ${key}=${raw} is not an exact decimal`);
      }
      if (declared.bounds !== undefined) {
        const low = Fx.parse(declared.bounds.min);
        const high = Fx.parse(declared.bounds.max);
        if (Fx.cmp(value, low) < 0 || Fx.cmp(value, high) > 0) {
          throw new OverrideRejected(
            `sandbox: override ${key}=${raw} is outside declared bounds ` +
              `[${declared.bounds.min}, ${declared.bounds.max}]`,
          );
        }
      }
      map.set(key, raw);
    }
    this.overrides = map;
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
    const raw = this.overrides.get(key) ?? SANDBOX_VALUES[key];
    if (raw === undefined) {
      throw new Error(`sandbox: ${key} is declared but has no value in SANDBOX_VALUES`);
    }
    const value = Fx.parse(raw);
    this.cache.set(key, value);
    return value;
  }

  /** Which keys this run is not using the registered value for. Sorted. */
  overriddenKeys(): readonly string[] {
    return [...this.overrides.keys()];
  }

  /** For parameters the RNG needs as a plain integer, e.g. odds. */
  getInt(key: string): number {
    const raw = Fx.raw(this.get(key)) / 1_000_000n;
    return Number(raw);
  }

  /** A factor carrying this parameter's declared provenance, never a guess at it. */
  factor(key: string, contribution: Fixed): Factor {
    const declared = this.registry.require(key);
    // A number somebody typed into a scenario is invented, whatever the registry
    // says the fitted value was. Overriding a CALIBRATED parameter throws its
    // calibration away, so the factor has to stop claiming it.
    const provenance = this.overrides.has(key) ? 'INVENTED' : declared.provenance;
    return { key, provenance, contribution };
  }

  /**
   * Every registered key paired with the value this run will actually use.
   * Sorted by codepoint, not by locale, because it is hashed.
   */
  effectiveValues(): readonly (readonly [string, string])[] {
    const pairs: (readonly [string, string])[] = [];
    for (const decl of this.registry.all()) {
      const raw = this.overrides.get(decl.key) ?? SANDBOX_VALUES[decl.key];
      if (raw !== undefined) pairs.push([decl.key, raw] as const);
    }
    return pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }

  /**
   * Locked invariant #5's paramSetId. It hashes the values, not the key names,
   * so two scenarios that override their way to the same numbers get the same
   * id and are directly comparable.
   */
  paramSetId(): string {
    const text = this.effectiveValues()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    return blake3Hex(new TextEncoder().encode(text)).slice(0, 16);
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
