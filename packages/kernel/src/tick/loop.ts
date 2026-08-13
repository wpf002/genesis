// The tick loop.
//
// Module execution order is the order of the array passed in, and nothing else
// (locked invariant #7). Each module gets its own RNG substream keyed by its id,
// so order affects when a module runs but not which numbers it draws.

import { Fx, type Fixed } from '../fixed.js';
import { Ledger, type Factor } from '../ledger/factor.js';
import { createRng, deriveStream, type Rng, type RngState } from '../rng/xoshiro.js';
import { blake3Hex } from '../state/blake3.js';
import {
  decodeSnapshot,
  encodeSnapshot,
  encodeState,
  type StateEntry,
} from '../state/encode.js';
import { StateStore } from '../state/store.js';

export interface TickContext {
  readonly tick: number;
  readonly rng: Rng;
  /** Reads any declared key, including another module's. */
  get(key: string): Fixed;
  /** Writes a key this module owns. Factors are required, not optional. */
  set(localKey: string, value: Fixed, factors: readonly Factor[]): void;
}

export interface SimModule {
  readonly id: string;
  /** Unqualified key names. The store qualifies them with the module id. */
  readonly stateKeys: readonly string[];
  init?(ctx: TickContext): void;
  tick(ctx: TickContext): void;
}

export interface RunOptions {
  readonly seed: bigint;
  readonly modules: readonly SimModule[];
}

export class Run {
  readonly ledger = new Ledger();
  private readonly store = new StateStore();
  private readonly streams = new Map<string, Rng>();
  private currentTick = 0;

  constructor(private readonly options: RunOptions) {
    const seen = new Set<string>();
    for (const module of options.modules) {
      if (seen.has(module.id)) throw new Error(`run: duplicate module id ${module.id}`);
      seen.add(module.id);
      this.store.declare(module.id, module.stateKeys);
      this.streams.set(module.id, createRng(deriveStream(options.seed, module.id)));
    }
    for (const module of options.modules) {
      module.init?.(this.contextFor(module));
    }
  }

  get tick(): number {
    return this.currentTick;
  }

  private contextFor(module: SimModule): TickContext {
    const rng = this.streams.get(module.id);
    if (rng === undefined) throw new Error(`run: no stream for ${module.id}`);
    return {
      tick: this.currentTick,
      rng,
      get: (key: string): Fixed => this.store.get(key),
      set: (localKey: string, value: Fixed, factors: readonly Factor[]): void => {
        const qualified = `${module.id}.${localKey}`;
        const owner = this.store.ownerOf(qualified);
        if (owner !== module.id) {
          throw new Error(`run: ${module.id} may not write ${qualified}`);
        }
        const previous = this.store.get(qualified);
        this.store.set(qualified, value);
        this.ledger.record({
          tick: this.currentTick,
          moduleId: module.id,
          stateKey: qualified,
          previous,
          next: value,
          factors,
        });
      },
    };
  }

  step(): void {
    this.currentTick += 1;
    for (const module of this.options.modules) {
      module.tick(this.contextFor(module));
    }
  }

  advanceTo(tick: number): void {
    if (tick < this.currentTick) {
      throw new Error(`run: cannot rewind from ${this.currentTick} to ${tick}`);
    }
    while (this.currentTick < tick) this.step();
  }

  entries(): readonly StateEntry[] {
    return this.store.entries();
  }

  get(key: string): Fixed {
    return this.store.get(key);
  }

  /** BLAKE3 over the canonical state encoding. RNG state is not included. */
  stateHash(): string {
    return blake3Hex(encodeState(this.currentTick, this.store.entries()));
  }

  snapshot(): Uint8Array {
    const streams: (readonly [string, RngState])[] = [];
    for (const module of this.options.modules) {
      const rng = this.streams.get(module.id);
      if (rng === undefined) throw new Error(`run: no stream for ${module.id}`);
      streams.push([module.id, rng.getState()]);
    }
    return encodeSnapshot({
      tick: this.currentTick,
      entries: this.store.entries(),
      streams,
    });
  }

  /**
   * Restores in place. The ledger is truncated to the snapshot tick so that
   * continuing from a restore produces the same ledger as an uninterrupted run.
   */
  restore(snapshot: Uint8Array): void {
    const payload = decodeSnapshot(snapshot);
    this.store.restore(payload.entries);
    this.currentTick = payload.tick;
    for (const [id, state] of payload.streams) {
      if (!this.streams.has(id)) throw new Error(`run: snapshot has unknown module ${id}`);
      this.streams.set(id, createRng(state));
    }
    if (payload.streams.length !== this.streams.size) {
      throw new Error('run: snapshot module set does not match this run');
    }
    this.ledger.truncateToTick(payload.tick);
  }
}

/** Convenience: build a run, advance it, return the terminal hash. */
export function terminalHash(options: RunOptions, ticks: number): string {
  const run = new Run(options);
  run.advanceTo(ticks);
  return run.stateHash();
}
