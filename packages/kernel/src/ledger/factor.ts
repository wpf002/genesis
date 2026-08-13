// The Factor ledger. Every state delta records what produced it, so the
// provenance inspector reads a record of the computation rather than an
// after-the-fact explanation of it.

import type { Fixed } from '../fixed.js';

export type Provenance = 'CALIBRATED' | 'ESTIMATED' | 'INVENTED';

export interface Factor {
  /** Parameter key, e.g. "agriculture.yield.tfp_exponent". */
  readonly key: string;
  readonly provenance: Provenance;
  readonly contribution: Fixed;
}

export interface LedgerEntry {
  readonly tick: number;
  readonly moduleId: string;
  readonly stateKey: string;
  readonly previous: Fixed;
  readonly next: Fixed;
  readonly factors: readonly Factor[];
}

export class Ledger {
  private readonly records: LedgerEntry[] = [];

  record(entry: LedgerEntry): void {
    this.records.push(entry);
  }

  get length(): number {
    return this.records.length;
  }

  all(): readonly LedgerEntry[] {
    return this.records;
  }

  atTick(tick: number): readonly LedgerEntry[] {
    return this.records.filter((e) => e.tick === tick);
  }

  forKey(stateKey: string): readonly LedgerEntry[] {
    return this.records.filter((e) => e.stateKey === stateKey);
  }

  /** Distinct provenance tags touched so far. Phase 2's gate walks this. */
  provenanceTouched(): ReadonlySet<Provenance> {
    const seen = new Set<Provenance>();
    for (const entry of this.records) {
      for (const factor of entry.factors) seen.add(factor.provenance);
    }
    return seen;
  }

  truncateToTick(tick: number): void {
    let keep = this.records.length;
    while (keep > 0 && (this.records[keep - 1] as LedgerEntry).tick > tick) keep -= 1;
    this.records.length = keep;
  }
}
