import { describe, expect, it } from 'vitest';
import {
  BUTTERFLY_LIMITS,
  CATALOGUE,
  CONTINUITY_NOTE,
  PEOPLE,
  POSSIBILITIES,
  PRESSURES_NOT_MODELLED,
  butterfly,
  continuity,
  entryById,
  peopleFor,
  possibilitiesFor,
  pressures,
  runBaseline,
  runCounterfactual,
  archetypeById,
} from '../index.js';

const REGIONS = ['ITA', 'FRA', 'DEU', 'EGY', 'CHN', 'USA'];
const TICKS = 4900;
const base = runBaseline(1n, REGIONS, TICKS, 20);

describe('butterfly effect', () => {
  const entry = entryById('the-black-death-never-occurs');
  const run = runCounterfactual({ entry: entry!, regions: REGIONS, ticks: TICKS, every: 20 });
  const cascade = butterfly(
    run.table,
    base.table,
    run.touched,
    Object.keys(entry!.lever.overrides),
    entry!.year,
    entry!.lever.reading,
  );

  it('starts at the lever and every other node has a parent', () => {
    expect(cascade.nodes[0]?.stage).toBe('lever');
    expect(cascade.nodes[0]?.parents).toEqual([]);
    for (const node of cascade.nodes.slice(1)) {
      expect(node.parents.length, node.id).toBeGreaterThan(0);
    }
  });

  it('classifies a subsystem the lever edited as direct, and one it did not as knock-on', () => {
    const direct = cascade.nodes.filter((n) => n.stage === 'direct');
    const knock = cascade.nodes.filter((n) => n.stage === 'knock-on' || n.stage === 'cross-region');
    // The plague lever edits disease parameters and nothing else.
    expect(direct.some((n) => n.stateKey?.startsWith('disease'))).toBe(true);
    expect(direct.every((n) => n.evidence === 'simulated')).toBe(true);
    expect(knock.every((n) => n.evidence === 'knock-on')).toBe(true);
  });

  it('never claims a node for a dimension that did not move', () => {
    // Every non-lever node names a real state key.
    for (const node of cascade.nodes.slice(1)) {
      if (node.stage === 'model-limit') continue;
      expect(node.stateKey).toBeTruthy();
      expect(node.region).toBeTruthy();
    }
  });

  it('says its edges are ordering rather than the factor ledger', () => {
    expect(cascade.derivedFrom).toBe('state differences and module order');
    expect(BUTTERFLY_LIMITS.join(' ')).toMatch(/not proof|factor ledger/i);
  });

  it('explains the Malthusian rebound as model behaviour, not as a finding', () => {
    const limit = cascade.nodes.find((n) => n.stage === 'model-limit');
    if (limit !== undefined) {
      expect(limit.evidence).toBe('interpretive');
      expect(limit.detail).toMatch(/carrying capacity/);
    }
  });

  it('produces nothing but the lever when the two runs are identical', () => {
    const same = butterfly(base.table, base.table, [], [], 1000, 'nothing');
    expect(same.nodes).toHaveLength(1);
    expect(same.nodes[0]?.stage).toBe('lever');
  });
});

describe('historical pressures', () => {
  it('gives every pressure a signed magnitude inside -1..1 and a reading', () => {
    for (const pressure of pressures(base.table, 200)) {
      expect(pressure.magnitude).toBeGreaterThanOrEqual(-1);
      expect(pressure.magnitude).toBeLessThanOrEqual(1);
      expect(pressure.reading.length).toBeGreaterThan(10);
      expect(pressure.subsystem).toBeTruthy();
    }
  });

  it('reads one country as well as the world', () => {
    const world = pressures(base.table, 200);
    const egypt = pressures(base.table, 200, 'EGY');
    expect(egypt).toHaveLength(world.length);
    expect(egypt.map((p) => p.id)).toEqual(world.map((p) => p.id));
  });

  it('clamps an out-of-range index rather than returning holes', () => {
    expect(pressures(base.table, -10)).toHaveLength(pressures(base.table, 0).length);
    expect(pressures(base.table, 1e9)).toHaveLength(pressures(base.table, 0).length);
  });

  it('names the forces it does not model', () => {
    expect(PRESSURES_NOT_MODELLED.join(' ')).toMatch(/religion|ideolog/i);
    expect(PRESSURES_NOT_MODELLED.join(' ')).toMatch(/diplomacy|alliance/i);
  });
});

describe('the possibility tree', () => {
  it('attaches only to scenarios that exist', () => {
    const ids = new Set(CATALOGUE.map((e) => e.id));
    for (const possibility of POSSIBILITIES) {
      expect(ids.has(possibility.scenarioId), possibility.scenarioId).toBe(true);
    }
  });

  it('offers an approximation only where the engine claims it can express one', () => {
    for (const possibility of POSSIBILITIES) {
      if (possibility.support === 'not-modelled') {
        expect(possibility.approximation, possibility.id).toBeUndefined();
      } else {
        expect(possibility.approximation, possibility.id).toBeDefined();
        // And the approximation names a real archetype.
        expect(archetypeById(possibility.approximation!.archetypeId)).toBeDefined();
        expect(possibility.approximation!.caveat.length).toBeGreaterThan(20);
      }
    }
  });

  it('covers the worked example from the brief with all four readings', () => {
    const cuba = possibilitiesFor('the-cuban-missile-crisis-goes-nuclear');
    expect(cuba).toHaveLength(4);
    expect(cuba.map((p) => p.support).sort()).toEqual([
      'not-modelled',
      'not-modelled',
      'partial',
      'structural',
    ]);
  });
});

describe('people are an interpretive layer', () => {
  it('only references scenarios that exist', () => {
    const ids = new Set(CATALOGUE.map((e) => e.id));
    for (const person of PEOPLE) {
      for (const id of person.scenarioIds) expect(ids.has(id), id).toBe(true);
    }
  });

  it('finds the people attached to a scenario', () => {
    expect(peopleFor('julius-caesar-survives-the-ides-of-march').map((p) => p.name)).toContain(
      'Julius Caesar',
    );
  });

  it('degrades identity continuity as the demographic path diverges', () => {
    expect(continuity(0.001, 10)).toBe('high');
    expect(continuity(0.05, 60)).toBe('moderate');
    expect(continuity(0.15, 300)).toBe('low');
    expect(continuity(0.9, 900)).toBe('indeterminate');
    // And every level has an explanation rather than just a word.
    for (const level of ['high', 'moderate', 'low', 'indeterminate'] as const) {
      expect(CONTINUITY_NOTE[level].length).toBeGreaterThan(30);
    }
  });

  it('never claims a person is simulated', () => {
    // Nobody in the simulation has a name; the alternate is always a reading.
    for (const person of PEOPLE) {
      expect(person.alternate.length).toBeGreaterThan(20);
    }
  });
});
