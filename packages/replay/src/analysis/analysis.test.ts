import { describe, expect, it } from 'vitest';
import { ParamRegistry, SANDBOX_PARAMS } from '@genesis/params';
import {
  cascades,
  convergence,
  DIMENSIONS,
  DISTANCE_METHOD,
  entryById,
  EVIDENCE,
  EVIDENCE_ORDER,
  firstDifference,
  modelAgainstRecord,
  realityDistance,
  realityDna,
  ripple,
  runBaseline,
  runCounterfactual,
  spread,
  weightTable,
  WORLD_POPULATION,
  type Scenario,
} from '../index.js';

// A small region set and span: this suite is about the analysis being correct,
// not about scale.
const REGIONS = ['ITA', 'FRA', 'DEU', 'EGY', 'CHN', 'USA'];
const TICKS = 4900; // 3000 BC to AD 1900, so a 1347 divergence has room to run

const base = runBaseline(1n, REGIONS, TICKS, 20);

function counterfactual(id: string) {
  const entry = entryById(id);
  if (entry === undefined) throw new Error(`no entry ${id}`);
  return { entry, run: runCounterfactual({ entry, regions: REGIONS, ticks: TICKS, every: 20 }) };
}

describe('reality distance', () => {
  it('is zero against itself', () => {
    for (const point of realityDistance(base.table, base.table)) {
      expect(point.distance).toBe(0);
    }
  });

  it('is zero before the divergence and positive after it', () => {
    const { entry, run } = counterfactual('the-black-death-never-occurs');
    const series = realityDistance(run.table, base.table);

    const before = series.filter((p) => p.tick < run.divergenceTick);
    const after = series.filter((p) => p.tick > run.divergenceTick + 200);

    // The strongest claim Genesis can make: pre-divergence state is identical,
    // so anything after is attributable to the intervention.
    expect(before.length).toBeGreaterThan(0);
    for (const point of before) expect(point.distance).toBe(0);
    expect(Math.max(...after.map((p) => p.distance))).toBeGreaterThan(0);
    expect(entry.year).toBe(1347);
  });

  it('stays inside 0..1', () => {
    const { run } = counterfactual('the-ancient-industrial-revolution');
    for (const point of realityDistance(run.table, base.table)) {
      expect(point.distance).toBeGreaterThanOrEqual(0);
      expect(point.distance).toBeLessThanOrEqual(1);
    }
  });

  it('breaks down into subsystems that sum to the whole', () => {
    const { run } = counterfactual('the-ancient-industrial-revolution');
    const point = realityDistance(run.table, base.table).at(-1);
    if (point === undefined) throw new Error('no series');
    const summed = Object.values(point.bySubsystem).reduce((a, b) => a + b, 0);
    expect(summed).toBeCloseTo(point.distance, 9);
  });

  it('every weight is registered and INVENTED, so the gate can see it', () => {
    const registry = new ParamRegistry();
    registry.registerAll(SANDBOX_PARAMS);
    for (const row of weightTable()) {
      expect(registry.has(row.param), row.param).toBe(true);
      expect(registry.provenanceOf(row.param)).toBe('INVENTED');
      expect(row.provenance).toBe('INVENTED');
    }
  });

  it('publishes its own formula and says what it is not', () => {
    expect(DISTANCE_METHOD.formula).toContain('Σ w');
    expect(DISTANCE_METHOD.caveats.join(' ')).toMatch(/model index/i);
    expect(DISTANCE_METHOD.caveats.join(' ')).toMatch(/INVENTED/);
  });
});

describe('first difference', () => {
  it('finds nothing between a run and itself', () => {
    expect(firstDifference(base.table, base.table)).toBeUndefined();
  });

  it('lands at or after the divergence, never before it', () => {
    const { run } = counterfactual('the-black-death-never-occurs');
    const found = firstDifference(run.table, base.table);
    expect(found).toBeDefined();
    expect(found?.tick).toBeGreaterThanOrEqual(run.divergenceTick);
    expect(found?.region).toBeTruthy();
    expect(DIMENSIONS.map((d) => d.key)).toContain(found?.key);
  });

  it('reports which regions the difference reached and which were targeted', () => {
    const { run } = counterfactual('the-black-death-never-occurs');
    const arrivals = spread(run.table, base.table, run.touched);
    expect(arrivals.length).toBeGreaterThan(0);
    // Sorted by when the difference arrived.
    for (let i = 1; i < arrivals.length; i += 1) {
      expect(arrivals[i]!.tick).toBeGreaterThanOrEqual(arrivals[i - 1]!.tick);
    }
    expect(arrivals.some((a) => a.targeted)).toBe(true);
  });
});

describe('cascades and convergence', () => {
  it('finds no cascade in a run against itself', () => {
    expect(cascades(realityDistance(base.table, base.table))).toEqual([]);
  });

  it('names the subsystems driving a cascade', () => {
    const { run } = counterfactual('the-ancient-industrial-revolution');
    const found = cascades(realityDistance(run.table, base.table));
    for (const event of found) {
      expect(event.kind).toBe('model-detected');
      expect(event.acceleration).toBeGreaterThan(1);
      expect(event.drivers.length).toBeGreaterThan(0);
    }
  });

  it('reports whether two worlds are drifting back together', () => {
    const { run } = counterfactual('the-black-death-never-occurs');
    const result = convergence(realityDistance(run.table, base.table));
    expect(result).toBeDefined();
    expect(result?.peakDistance).toBeGreaterThanOrEqual(result?.finalDistance ?? 0);
  });
});

describe('ripple', () => {
  it('says which kind of trace it is rather than letting the reader assume', () => {
    const { entry, run } = counterfactual('the-black-death-never-occurs');
    const changed = Object.keys(entry.lever.overrides);

    const coarse = ripple(run.table, base.table, run.touched, changed, false);
    expect(coarse.fidelity).toBe('aggregated difference trace');
    expect(ripple(run.table, base.table, run.touched, changed, true).fidelity).toBe(
      'full causal trace',
    );

    expect(coarse.rings).toHaveLength(5);
    expect(coarse.rings[0]?.entries.map((e) => e.label)).toEqual(changed);
    // Ring 1 is honest about what an override is.
    expect(coarse.rings[0]?.entries[0]?.detail).toMatch(/INVENTED/);
  });
});

describe('reality dna', () => {
  it('gives one axis per modelled dimension, all normalised', () => {
    const dna = realityDna(base.table, 100);
    expect(dna.axes).toHaveLength(DIMENSIONS.length);
    for (const axis of dna.axes) {
      expect(axis.value).toBeGreaterThanOrEqual(0);
      expect(axis.value).toBeLessThanOrEqual(1);
    }
  });

  it('clamps an out-of-range index instead of returning holes', () => {
    expect(realityDna(base.table, -5).axes).toHaveLength(DIMENSIONS.length);
    expect(realityDna(base.table, 1e9).axes).toHaveLength(DIMENSIONS.length);
  });
});

describe('evidence taxonomy', () => {
  it('keeps all seven classes distinct', () => {
    expect(EVIDENCE_ORDER).toHaveLength(7);
    const colors = EVIDENCE_ORDER.map((c) => EVIDENCE[c].color);
    expect(new Set(colors).size).toBe(colors.length);
    const labels = EVIDENCE_ORDER.map((c) => EVIDENCE[c].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('model against record', () => {
  it('compares shape, not level, and carries the observation band', () => {
    const yearIndex = (table: typeof base.table) => (year: number) => {
      const tick = year + 3000;
      let best: number | undefined;
      for (let i = 0; i < table.ticks.length; i += 1) {
        if ((table.ticks[i] as number) <= tick) best = i;
        else break;
      }
      if (best === undefined) return undefined;
      let sum = 0;
      for (const region of table.regions) {
        sum += table.values.get(`${region}:demography.population`)?.[best] ?? 0;
      }
      return sum;
    };

    const fit = modelAgainstRecord(yearIndex(base.table), undefined, 1000);
    expect(fit.length).toBeGreaterThan(3);
    for (const point of fit) {
      expect(point.observedLowIndex).toBeLessThanOrEqual(point.observedIndex);
      expect(point.observedHighIndex).toBeGreaterThanOrEqual(point.observedIndex);
      expect(point.sourceId).toBeTruthy();
    }
    // Indexed at the anchor year, both series are 1 there by construction.
    const anchor = fit.find((p) => p.year === 1000);
    expect(anchor?.observedIndex).toBeCloseTo(1, 9);
    expect(anchor?.baselineIndex).toBeCloseTo(1, 9);
  });

  it('carries an uncertainty band on every historical observation', () => {
    for (const observation of WORLD_POPULATION) {
      expect(observation.uncertaintyM).toBeGreaterThan(0);
      expect(observation.sourceId).toBeTruthy();
    }
  });
});

describe('history is not simulation input', () => {
  it('does not appear in any scenario configuration', () => {
    // Historical prose must be able to change without moving a hash.
    const entry = entryById('the-black-death-never-occurs') as unknown as Scenario;
    expect(JSON.stringify(entry)).not.toContain('Messina');
  });
});
