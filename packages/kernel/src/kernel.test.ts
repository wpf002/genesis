import { describe, expect, it } from 'vitest';
import { Fx } from './fixed.js';
import { createRng, deriveStream } from './rng/xoshiro.js';
import { Run, terminalHash } from './tick/loop.js';
import { noopModule, REFERENCE_MODULES } from './testing/reference-model.js';

const SEED = 20260806n;
const options = { seed: SEED, modules: REFERENCE_MODULES };

describe('fixed-point', () => {
  it('parses and prints without going through a float', () => {
    expect(Fx.toString(Fx.parse('1.5'))).toBe('1.500000');
    expect(Fx.toString(Fx.parse('-0.000001'))).toBe('-0.000001');
    expect(Fx.toString(Fx.fromInt(1000))).toBe('1000.000000');
  });

  it('rejects non-integer numbers rather than truncating them', () => {
    expect(() => Fx.fromInt(1.5)).toThrow(RangeError);
  });

  it('rejects more precision than the scale can hold', () => {
    expect(() => Fx.parse('0.0000001')).toThrow(RangeError);
  });

  it('rounds half away from zero, symmetrically', () => {
    // 0.0000005 * 1 rounds up; the negative rounds down by the same amount.
    expect(Fx.raw(Fx.ratio(1, 2))).toBe(500000n);
    expect(Fx.raw(Fx.ratio(-1, 2))).toBe(-500000n);
    expect(Fx.raw(Fx.ratio(1, 3))).toBe(333333n);
    expect(Fx.raw(Fx.ratio(2, 3))).toBe(666667n);
    expect(Fx.raw(Fx.ratio(-2, 3))).toBe(-666667n);
  });

  it('multiplies and divides exactly at scale', () => {
    expect(Fx.toString(Fx.mul(Fx.parse('1.5'), Fx.parse('2')))).toBe('3.000000');
    expect(Fx.toString(Fx.div(Fx.parse('3'), Fx.parse('2')))).toBe('1.500000');
  });
});

describe('rng', () => {
  it('is reproducible from a state', () => {
    const state = deriveStream(SEED, 'climate');
    const a = createRng(state);
    const b = createRng(state);
    for (let i = 0; i < 100; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('gives different modules independent streams', () => {
    const a = createRng(deriveStream(SEED, 'climate'));
    const b = createRng(deriveStream(SEED, 'population'));
    expect(a.nextU32()).not.toBe(b.nextU32());
  });

  it('derives a stream from the module id, not from call order', () => {
    // This is what keeps a new module from shifting an existing one's draws.
    expect(deriveStream(SEED, 'population')).toEqual(deriveStream(SEED, 'population'));
    expect(deriveStream(SEED, 'population')).not.toEqual(deriveStream(SEED + 1n, 'population'));
  });

  it('stays in bounds', () => {
    const rng = createRng(deriveStream(SEED, 'bounds'));
    for (let i = 0; i < 5000; i++) {
      const v = rng.nextBelow(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('resumes from a captured state', () => {
    const rng = createRng(deriveStream(SEED, 'resume'));
    for (let i = 0; i < 10; i++) rng.nextU32();
    const captured = rng.getState();
    const expected = [rng.nextU32(), rng.nextU32(), rng.nextU32()];
    const resumed = createRng(captured);
    expect([resumed.nextU32(), resumed.nextU32(), resumed.nextU32()]).toEqual(expected);
  });
});

describe('determinism', () => {
  it('produces the same terminal hash for the same seed', () => {
    expect(terminalHash(options, 120)).toBe(terminalHash(options, 120));
  });

  it('produces a different terminal hash for a different seed', () => {
    expect(terminalHash(options, 120)).not.toBe(
      terminalHash({ seed: SEED + 1n, modules: REFERENCE_MODULES }, 120),
    );
  });

  it('matches an uninterrupted run after restore-and-continue', () => {
    const straight = new Run(options);
    straight.advanceTo(40);
    const snapshot = straight.snapshot();
    straight.advanceTo(120);

    const restored = new Run(options);
    restored.restore(snapshot);
    expect(restored.tick).toBe(40);
    restored.advanceTo(120);

    expect(restored.stateHash()).toBe(straight.stateHash());
  });

  it('is unchanged by a no-op module in any position', () => {
    const base = terminalHash(options, 120);
    expect(terminalHash({ seed: SEED, modules: [...REFERENCE_MODULES, noopModule] }, 120)).toBe(base);
    expect(terminalHash({ seed: SEED, modules: [noopModule, ...REFERENCE_MODULES] }, 120)).toBe(base);
  });

  it('changes the hash when a module actually writes', () => {
    // Guards against the no-op test passing because the hash ignores modules.
    const base = terminalHash(options, 120);
    const extra = {
      id: 'extra',
      stateKeys: ['value'],
      tick(ctx: { set: (k: string, v: ReturnType<typeof Fx.fromInt>, f: []) => void }) {
        ctx.set('value', Fx.fromInt(1), []);
      },
    };
    expect(terminalHash({ seed: SEED, modules: [...REFERENCE_MODULES, extra] }, 120)).not.toBe(base);
  });
});

describe('ledger', () => {
  it('records a factor breakdown for every write', () => {
    const run = new Run(options);
    run.advanceTo(5);
    const entries = run.ledger.forKey('population.count');
    expect(entries.length).toBe(6); // init + 5 ticks
    for (const entry of entries) expect(entry.factors.length).toBeGreaterThan(0);
    expect(run.ledger.provenanceTouched()).toEqual(new Set(['INVENTED']));
  });

  it('truncates to the snapshot tick on restore', () => {
    const run = new Run(options);
    run.advanceTo(10);
    const snapshot = run.snapshot();
    const lengthAtTen = run.ledger.length;
    run.advanceTo(30);
    expect(run.ledger.length).toBeGreaterThan(lengthAtTen);
    run.restore(snapshot);
    expect(run.ledger.length).toBe(lengthAtTen);
  });
});

describe('state ownership', () => {
  it('refuses a write to another module\'s key', () => {
    const trespasser = {
      id: 'trespasser',
      stateKeys: [] as string[],
      tick(ctx: { set: (k: string, v: ReturnType<typeof Fx.fromInt>, f: []) => void }) {
        ctx.set('count', Fx.fromInt(1), []);
      },
    };
    const run = new Run({ seed: SEED, modules: [...REFERENCE_MODULES, trespasser] });
    expect(() => run.step()).toThrow(/may not write/);
  });
});
