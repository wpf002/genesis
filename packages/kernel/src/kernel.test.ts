import { describe, expect, it } from 'vitest';
import { KERNEL_VERSION, PHASE } from './index.js';

describe('@genesis/kernel', () => {
  it('exposes a version', () => {
    expect(KERNEL_VERSION).toBe('0.0.0');
  });

  it('is still at Phase 0 — bump this deliberately when the kernel lands', () => {
    expect(PHASE).toBe(0);
  });
});
