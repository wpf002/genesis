// Seeded PRNG for decoration only. Not the kernel stream, and nothing simulated
// may draw from it. The kernel's xoshiro128** lands in Phase 1 and stays
// separate from this one on purpose.

/** mulberry32 — small, fast, good enough for pixels. */
export function decorativeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
