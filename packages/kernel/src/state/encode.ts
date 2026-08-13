// Canonical byte encoding. The state hash is defined as BLAKE3 over the output of
// encodeState, so this format is load-bearing: changing it changes every hash the
// project has ever published. Version it, never edit it in place.
//
// Key order comes from the module declaration order held by StateStore. It is
// never derived from key iteration over an object (locked invariant #7).

import { Fx, type Fixed } from '../fixed.js';
import type { RngState } from '../rng/xoshiro.js';

export const STATE_FORMAT = 1;
export const SNAPSHOT_FORMAT = 1;

export interface StateEntry {
  readonly key: string;
  readonly value: Fixed;
}

class ByteWriter {
  private buffer = new Uint8Array(1024);
  private length = 0;

  private ensure(extra: number): void {
    if (this.length + extra <= this.buffer.length) return;
    let size = this.buffer.length * 2;
    while (size < this.length + extra) size *= 2;
    const grown = new Uint8Array(size);
    grown.set(this.buffer.subarray(0, this.length), 0);
    this.buffer = grown;
  }

  u8(v: number): void {
    this.ensure(1);
    this.buffer[this.length++] = v & 0xff;
  }

  u16(v: number): void {
    this.ensure(2);
    this.buffer[this.length++] = (v >>> 8) & 0xff;
    this.buffer[this.length++] = v & 0xff;
  }

  u32(v: number): void {
    this.ensure(4);
    this.buffer[this.length++] = (v >>> 24) & 0xff;
    this.buffer[this.length++] = (v >>> 16) & 0xff;
    this.buffer[this.length++] = (v >>> 8) & 0xff;
    this.buffer[this.length++] = v & 0xff;
  }

  bytes(b: Uint8Array): void {
    this.ensure(b.length);
    this.buffer.set(b, this.length);
    this.length += b.length;
  }

  /** Length-prefixed UTF-8. */
  text(s: string): void {
    const encoded = new TextEncoder().encode(s);
    this.u16(encoded.length);
    this.bytes(encoded);
  }

  /** Sign byte, then big-endian magnitude with a length prefix. */
  bigint(v: bigint): void {
    const negative = v < 0n;
    let magnitude = negative ? -v : v;
    const digits: number[] = [];
    while (magnitude > 0n) {
      digits.push(Number(magnitude & 0xffn));
      magnitude >>= 8n;
    }
    digits.reverse();
    this.u8(negative ? 1 : 0);
    this.u8(digits.length);
    this.ensure(digits.length);
    for (const d of digits) this.buffer[this.length++] = d;
  }

  finish(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

class ByteReader {
  private offset = 0;
  constructor(private readonly buffer: Uint8Array) {}

  u8(): number {
    return this.buffer[this.offset++] as number;
  }

  u16(): number {
    return (this.u8() << 8) | this.u8();
  }

  u32(): number {
    return ((this.u8() << 24) | (this.u16() << 8) | this.u8()) >>> 0;
  }

  text(): string {
    const length = this.u16();
    const slice = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return new TextDecoder().decode(slice);
  }

  bigint(): bigint {
    const negative = this.u8() === 1;
    const length = this.u8();
    let value = 0n;
    for (let i = 0; i < length; i++) value = (value << 8n) | BigInt(this.u8());
    return negative ? -value : value;
  }
}

/**
 * The hashed form of simulation state.
 *
 * RNG state is deliberately absent. Including it would mean that adding a module
 * that draws nothing still changes the terminal hash, which the Phase 1 exit gate
 * forbids. RNG state lives in the snapshot instead, where it is needed for
 * restore but does not participate in identity.
 */
export function encodeState(tick: number, entries: readonly StateEntry[]): Uint8Array {
  const w = new ByteWriter();
  w.u8(STATE_FORMAT);
  w.u32(tick);
  w.u32(entries.length);
  for (const entry of entries) {
    w.text(entry.key);
    w.bigint(Fx.raw(entry.value));
  }
  return w.finish();
}

export interface SnapshotPayload {
  readonly tick: number;
  readonly entries: readonly StateEntry[];
  readonly streams: readonly (readonly [string, RngState])[];
}

export function encodeSnapshot(payload: SnapshotPayload): Uint8Array {
  const w = new ByteWriter();
  w.u8(SNAPSHOT_FORMAT);
  w.bytes(encodeState(payload.tick, payload.entries));
  w.u32(payload.streams.length);
  for (const [id, state] of payload.streams) {
    w.text(id);
    w.u32(state.s0);
    w.u32(state.s1);
    w.u32(state.s2);
    w.u32(state.s3);
  }
  return w.finish();
}

export function decodeSnapshot(bytes: Uint8Array): SnapshotPayload {
  const r = new ByteReader(bytes);
  const snapshotFormat = r.u8();
  if (snapshotFormat !== SNAPSHOT_FORMAT) {
    throw new Error(`snapshot: unsupported format ${snapshotFormat}`);
  }
  const stateFormat = r.u8();
  if (stateFormat !== STATE_FORMAT) {
    throw new Error(`snapshot: unsupported state format ${stateFormat}`);
  }
  const tick = r.u32();
  const entryCount = r.u32();
  const entries: StateEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    const key = r.text();
    entries.push({ key, value: Fx.fromRaw(r.bigint()) });
  }
  const streamCount = r.u32();
  const streams: (readonly [string, RngState])[] = [];
  for (let i = 0; i < streamCount; i++) {
    const id = r.text();
    streams.push([id, { s0: r.u32(), s1: r.u32(), s2: r.u32(), s3: r.u32() }]);
  }
  return { tick, entries, streams };
}
