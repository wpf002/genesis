// BLAKE3, implemented here rather than pulled in, because @genesis/kernel has no
// runtime dependencies and node:crypto does not offer BLAKE3 on Node 20.
// Hash mode only — no keyed hashing, no derive_key, no XOF beyond 32 bytes.
// Verified against the official test vectors in blake3.test.ts.

const IV: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
  0x5be0cd19,
];

const MSG_PERMUTATION: readonly number[] = [
  2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8,
];

const CHUNK_START = 1;
const CHUNK_END = 2;
const PARENT = 4;
const ROOT = 8;

const BLOCK_LEN = 64;
const CHUNK_LEN = 1024;

const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0;

function g(
  s: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  mx: number,
  my: number,
): void {
  let sa = s[a] as number;
  let sb = s[b] as number;
  let sc = s[c] as number;
  let sd = s[d] as number;

  sa = (sa + sb + mx) >>> 0;
  sd = rotr(sd ^ sa, 16);
  sc = (sc + sd) >>> 0;
  sb = rotr(sb ^ sc, 12);
  sa = (sa + sb + my) >>> 0;
  sd = rotr(sd ^ sa, 8);
  sc = (sc + sd) >>> 0;
  sb = rotr(sb ^ sc, 7);

  s[a] = sa;
  s[b] = sb;
  s[c] = sc;
  s[d] = sd;
}

function round(s: Uint32Array, m: Uint32Array): void {
  g(s, 0, 4, 8, 12, m[0] as number, m[1] as number);
  g(s, 1, 5, 9, 13, m[2] as number, m[3] as number);
  g(s, 2, 6, 10, 14, m[4] as number, m[5] as number);
  g(s, 3, 7, 11, 15, m[6] as number, m[7] as number);
  g(s, 0, 5, 10, 15, m[8] as number, m[9] as number);
  g(s, 1, 6, 11, 12, m[10] as number, m[11] as number);
  g(s, 2, 7, 8, 13, m[12] as number, m[13] as number);
  g(s, 3, 4, 9, 14, m[14] as number, m[15] as number);
}

function permute(m: Uint32Array): Uint32Array {
  const out = new Uint32Array(16);
  for (let i = 0; i < 16; i++) out[i] = m[MSG_PERMUTATION[i] as number] as number;
  return out;
}

function compress(
  cv: Uint32Array,
  block: Uint32Array,
  counter: number,
  blockLen: number,
  flags: number,
): Uint32Array {
  const s = new Uint32Array(16);
  for (let i = 0; i < 8; i++) s[i] = cv[i] as number;
  for (let i = 0; i < 4; i++) s[8 + i] = IV[i] as number;
  s[12] = counter >>> 0;
  s[13] = Math.floor(counter / 4294967296) >>> 0;
  s[14] = blockLen >>> 0;
  s[15] = flags >>> 0;

  let m = block;
  for (let r = 0; r < 7; r++) {
    round(s, m);
    if (r < 6) m = permute(m);
  }

  for (let i = 0; i < 8; i++) {
    s[i] = ((s[i] as number) ^ (s[i + 8] as number)) >>> 0;
    s[i + 8] = ((s[i + 8] as number) ^ (cv[i] as number)) >>> 0;
  }
  return s;
}

function wordsFromBlock(block: Uint8Array): Uint32Array {
  const w = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    const o = i * 4;
    w[i] =
      (((block[o] as number) |
        ((block[o + 1] as number) << 8) |
        ((block[o + 2] as number) << 16) |
        ((block[o + 3] as number) << 24)) >>>
      0);
  }
  return w;
}

interface Output {
  readonly inputCv: Uint32Array;
  readonly blockWords: Uint32Array;
  readonly counter: number;
  readonly blockLen: number;
  readonly flags: number;
}

const chainingValue = (o: Output): Uint32Array =>
  compress(o.inputCv, o.blockWords, o.counter, o.blockLen, o.flags).slice(0, 8);

function rootBytes32(o: Output): Uint8Array {
  const words = compress(o.inputCv, o.blockWords, 0, o.blockLen, o.flags | ROOT);
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const w = words[i] as number;
    const b = i * 4;
    out[b] = w & 0xff;
    out[b + 1] = (w >>> 8) & 0xff;
    out[b + 2] = (w >>> 16) & 0xff;
    out[b + 3] = (w >>> 24) & 0xff;
  }
  return out;
}

class ChunkState {
  cv: Uint32Array;
  readonly chunkCounter: number;
  readonly block = new Uint8Array(BLOCK_LEN);
  blockLen = 0;
  blocksCompressed = 0;

  constructor(key: Uint32Array, chunkCounter: number) {
    this.cv = key.slice(0, 8);
    this.chunkCounter = chunkCounter;
  }

  get length(): number {
    return BLOCK_LEN * this.blocksCompressed + this.blockLen;
  }

  private startFlag(): number {
    return this.blocksCompressed === 0 ? CHUNK_START : 0;
  }

  update(input: Uint8Array): void {
    let offset = 0;
    while (offset < input.length) {
      if (this.blockLen === BLOCK_LEN) {
        const words = wordsFromBlock(this.block);
        this.cv = compress(
          this.cv,
          words,
          this.chunkCounter,
          BLOCK_LEN,
          this.startFlag(),
        ).slice(0, 8);
        this.blocksCompressed += 1;
        this.block.fill(0);
        this.blockLen = 0;
      }
      const want = BLOCK_LEN - this.blockLen;
      const take = Math.min(want, input.length - offset);
      this.block.set(input.subarray(offset, offset + take), this.blockLen);
      this.blockLen += take;
      offset += take;
    }
  }

  output(): Output {
    return {
      inputCv: this.cv,
      blockWords: wordsFromBlock(this.block),
      counter: this.chunkCounter,
      blockLen: this.blockLen,
      flags: this.startFlag() | CHUNK_END,
    };
  }
}

function parentOutput(left: Uint32Array, right: Uint32Array, key: Uint32Array): Output {
  const blockWords = new Uint32Array(16);
  blockWords.set(left, 0);
  blockWords.set(right, 8);
  return {
    inputCv: key,
    blockWords,
    counter: 0,
    blockLen: BLOCK_LEN,
    flags: PARENT,
  };
}

/** BLAKE3-256 over the given bytes. */
export function blake3(input: Uint8Array): Uint8Array {
  const key = Uint32Array.from(IV);
  const cvStack: Uint32Array[] = [];
  let chunk = new ChunkState(key, 0);

  let offset = 0;
  while (offset < input.length) {
    if (chunk.length === CHUNK_LEN) {
      const cv = chainingValue(chunk.output());
      let totalChunks = chunk.chunkCounter + 1;
      let merged = cv;
      // Merge right-to-left for every trailing zero bit of the chunk count.
      while (totalChunks % 2 === 0) {
        const left = cvStack.pop() as Uint32Array;
        merged = chainingValue(parentOutput(left, merged, key));
        totalChunks /= 2;
      }
      cvStack.push(merged);
      chunk = new ChunkState(key, chunk.chunkCounter + 1);
    }
    const want = CHUNK_LEN - chunk.length;
    const take = Math.min(want, input.length - offset);
    chunk.update(input.subarray(offset, offset + take));
    offset += take;
  }

  let output = chunk.output();
  for (let i = cvStack.length - 1; i >= 0; i--) {
    output = parentOutput(cvStack[i] as Uint32Array, chainingValue(output), key);
  }
  return rootBytes32(output);
}

const HEX = '0123456789abcdef';

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    out += (HEX[b >>> 4] as string) + (HEX[b & 0x0f] as string);
  }
  return out;
}

/** BLAKE3-256 as lowercase hex. This is the canonical form of a state hash. */
export const blake3Hex = (input: Uint8Array): string => toHex(blake3(input));
