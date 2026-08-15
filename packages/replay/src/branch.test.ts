import { describe, expect, it } from 'vitest';
import { Fx, Run } from '@genesis/kernel';
import { RigorUnavailable } from '@genesis/params';
import { sandboxModules } from '@genesis/models';
import { branch, NarrativeClaimRefused, rigorInterval } from './branch.js';

const options = () => ({ seed: 20260806n, modules: sandboxModules() });
const request = (mode: 'RIGOR' | 'SANDBOX') => ({
  mode,
  options: options(),
  forkTick: 50,
  ticks: 200,
  intervention: {
    stateKey: 'demography.population',
    value: Fx.fromInt(500),
    rationale: 'halve the population at tick 50',
  },
});

describe('counterfactual branching', () => {
  it('diverges from the parent, and the parent is untouched', () => {
    const result = branch(request('SANDBOX'));
    expect(result.branchHash).not.toBe(result.parentHash);
    expect(result.diverged.length).toBeGreaterThan(0);

    const control = new Run(options());
    control.advanceTo(200);
    expect(control.stateHash()).toBe(result.parentHash);
  });

  it('is reproducible', () => {
    expect(branch(request('SANDBOX')).branchHash).toBe(
      branch(request('SANDBOX')).branchHash,
    );
  });

  it('watermarks a Sandbox branch', () => {
    expect(branch(request('SANDBOX')).watermarkRequired).toBe(true);
  });

  it('refuses an intervention that changes nothing', () => {
    const run = new Run(options());
    run.advanceTo(50);
    expect(() =>
      branch({
        ...request('SANDBOX'),
        intervention: {
          stateKey: 'demography.population',
          value: run.get('demography.population'),
          rationale: 'no-op',
        },
      }),
    ).toThrow(/changes nothing/);
  });

  it('refuses a Rigor counterfactual, because Rigor has no model', () => {
    expect(() => branch(request('RIGOR'))).toThrow(RigorUnavailable);
  });
});

describe('the hard product rule', () => {
  it('reports an interval', () => {
    const interval = rigorInterval('x', [Fx.fromInt(2), Fx.fromInt(9), Fx.fromInt(5)]);
    expect(Fx.toString(interval.low)).toBe('2.000000');
    expect(Fx.toString(interval.high)).toBe('9.000000');
  });

  it('refuses to attach a narrative claim', () => {
    expect(() =>
      rigorInterval('x', [Fx.fromInt(1)], 'the Industrial Revolution happens before 1800'),
    ).toThrow(NarrativeClaimRefused);
  });

  it('has nowhere to put a probability', () => {
    const interval = rigorInterval('x', [Fx.fromInt(1), Fx.fromInt(3)]);
    expect(Object.keys(interval).sort()).toEqual(['high', 'low', 'stateKey']);
  });
});

describe('divergence timeline', () => {
  it('names the tick each key split, and what the branch blamed', async () => {
    const { divergenceTimeline } = await import('./divergence.js');
    const result = branch(request('SANDBOX'));
    const timeline = divergenceTimeline(result.parent, result.child);

    expect(timeline.length).toBeGreaterThan(0);
    // The intervention lands at the fork, so nothing splits before it.
    expect(timeline[0]?.tick).toBeGreaterThanOrEqual(result.forkTick);
    // Sorted, so the head of the list is the origin of the split.
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i]!.tick).toBeGreaterThanOrEqual(timeline[i - 1]!.tick);
    }
    // "Why" comes out of the ledger, not from a reconstruction.
    expect(timeline[0]?.because.length).toBeGreaterThan(0);
    for (const factor of timeline[0]!.because) {
      expect(['CALIBRATED', 'ESTIMATED', 'INVENTED']).toContain(factor.provenance);
    }
  });

  it('is empty when nothing was intervened on', async () => {
    const { divergenceTimeline } = await import('./divergence.js');
    const a = new Run(options());
    const b = new Run(options());
    a.advanceTo(100);
    b.advanceTo(100);
    expect(divergenceTimeline(a, b)).toEqual([]);
  });
});
