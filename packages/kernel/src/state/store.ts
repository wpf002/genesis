// The state store. Keys are declared up front by each module and iterated in
// declaration order — never by key iteration over an object (locked invariant #7).

import { Fx, type Fixed } from '../fixed.js';
import type { StateEntry } from './encode.js';

export class StateStore {
  /** Fully-qualified keys, in declaration order. This is the encoding order. */
  private readonly order: string[] = [];
  private readonly values = new Map<string, Fixed>();
  private readonly owners = new Map<string, string>();

  declare(moduleId: string, keys: readonly string[]): void {
    for (const key of keys) {
      const qualified = `${moduleId}.${key}`;
      if (this.values.has(qualified)) {
        throw new Error(`state: duplicate key ${qualified}`);
      }
      this.order.push(qualified);
      this.values.set(qualified, Fx.ZERO);
      this.owners.set(qualified, moduleId);
    }
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  ownerOf(key: string): string | undefined {
    return this.owners.get(key);
  }

  get(key: string): Fixed {
    const value = this.values.get(key);
    if (value === undefined) throw new Error(`state: unknown key ${key}`);
    return value;
  }

  set(key: string, value: Fixed): void {
    if (!this.values.has(key)) throw new Error(`state: unknown key ${key}`);
    this.values.set(key, value);
  }

  entries(): readonly StateEntry[] {
    return this.order.map((key) => ({ key, value: this.get(key) }));
  }

  /** Overwrites values from a snapshot. The key set must match exactly. */
  restore(entries: readonly StateEntry[]): void {
    if (entries.length !== this.order.length) {
      throw new Error(
        `state: snapshot has ${entries.length} keys, run declares ${this.order.length}`,
      );
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] as StateEntry;
      const expected = this.order[i] as string;
      if (entry.key !== expected) {
        throw new Error(`state: snapshot key ${entry.key} does not match ${expected}`);
      }
      this.values.set(entry.key, entry.value);
    }
  }
}
