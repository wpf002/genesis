// xoshiro128**, kernel-owned. Locked invariant #2: this is the only source of
// randomness in the simulation.
//
// Substreams are derived by hashing (seed, label) rather than by splitting a
// single sequence, so a module's draws depend on its own id and nothing else.
// Adding a module therefore cannot shift another module's stream — which is a
// Phase 1 exit criterion, not a nicety.

import { Fx, FIXED_SCALE, type Fixed } from '../fixed.js';
import { blake3 } from '../state/blake3.js';

export interface RngState {
  readonly s0: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
}

export interface Rng {
  /** Uniform in [0, 2^32). */
  nextU32(): number;
  /** Uniform in [0, bound), rejection-sampled so it stays unbiased. */
  nextBelow(bound: number): number;
  /** Uniform in [0, 1) as a Fixed. */
  nextUnit(): Fixed;
  getState(): RngState;
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

export function deriveStream(seed: bigint, label: string): RngState {
  if (seed < 0n) throw new RangeError('rng: seed must be non-negative');

  // 8 bytes of seed, big-endian, then the label. Distinct labels cannot collide
  // with a differently-split seed.
  const seedBytes = new Uint8Array(8);
  let s = seed;
  for (let i = 7; i >= 0; i--) {
    seedBytes[i] = Number(s & 0xffn);
    s >>= 8n;
  }
  const labelBytes = new TextEncoder().encode(label);
  const input = new Uint8Array(seedBytes.length + labelBytes.length);
  input.set(seedBytes, 0);
  input.set(labelBytes, seedBytes.length);

  const digest = blake3(input);
  const word = (o: number): number =>
    (((digest[o] as number) << 24) |
      ((digest[o + 1] as number) << 16) |
      ((digest[o + 2] as number) << 8) |
      (digest[o + 3] as number)) >>>
    0;

  const state = { s0: word(0), s1: word(4), s2: word(8), s3: word(12) };
  // An all-zero state is a fixed point of the generator. Astronomically unlikely,
  // still cheaper to rule out than to debug.
  if (state.s0 === 0 && state.s1 === 0 && state.s2 === 0 && state.s3 === 0) {
    return { s0: 1, s1: state.s1, s2: state.s2, s3: state.s3 };
  }
  return state;
}

export function createRng(initial: RngState): Rng {
  let s0 = initial.s0 >>> 0;
  let s1 = initial.s1 >>> 0;
  let s2 = initial.s2 >>> 0;
  let s3 = initial.s3 >>> 0;

  const nextU32 = (): number => {
    const result = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0) as number;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  };

  return {
    nextU32,
    nextBelow(bound: number): number {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new RangeError(`rng: bound must be a positive integer, got ${bound}`);
      }
      // Reject the unrepresentable tail so every residue is equally likely.
      const threshold = (4294967296 - bound) % bound;
      let x = nextU32();
      while (x < threshold) x = nextU32();
      return x % bound;
    },
    nextUnit(): Fixed {
      return Fx.fromRaw((BigInt(nextU32()) * FIXED_SCALE) / 4294967296n);
    },
    getState: (): RngState => ({ s0, s1, s2, s3 }),
  };
}
