import { describe, expect, it } from 'vitest';
import { Run } from '@genesis/kernel';
import { sandboxModules } from '@genesis/models';
import { exportRun, isWatermarked, SANDBOX_WATERMARK } from './index.js';

const run = () => {
  const r = new Run({ seed: 20260806n, modules: sandboxModules() });
  r.advanceTo(50);
  return r;
};

describe('export watermarking (locked invariant #8)', () => {
  it('marks every Sandbox export', () => {
    const r = run();
    const text = exportRun({
      mode: 'SANDBOX',
      seed: 20260806n,
      tick: 50,
      stateHash: r.stateHash(),
      entries: r.entries(),
    });
    expect(isWatermarked(text)).toBe(true);
    for (const line of SANDBOX_WATERMARK) expect(text).toContain(line);
    // The mark is first, so a truncated paste still carries it.
    expect(text.startsWith(SANDBOX_WATERMARK[0])).toBe(true);
  });

  it('has no option to turn the mark off', () => {
    const r = run();
    const keys = Object.keys({
      mode: 'SANDBOX',
      seed: 0n,
      tick: 0,
      stateHash: '',
      entries: r.entries(),
    });
    expect(keys.some((k) => /watermark|mark|strip|raw/i.test(k))).toBe(false);
  });

  it('carries the state hash, so an export can be checked against a replay', () => {
    const r = run();
    const text = exportRun({
      mode: 'SANDBOX',
      seed: 20260806n,
      tick: 50,
      stateHash: r.stateHash(),
      entries: r.entries(),
    });
    expect(text).toContain(r.stateHash());
  });

  it('does not watermark a Rigor export', () => {
    const r = run();
    const text = exportRun({
      mode: 'RIGOR',
      seed: 20260806n,
      tick: 50,
      stateHash: r.stateHash(),
      entries: r.entries(),
    });
    expect(isWatermarked(text)).toBe(false);
    expect(text).toContain('# mode RIGOR');
  });
});
