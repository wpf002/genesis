import { describe, expect, it } from 'vitest';
import { ParamRegistry } from './registry/registry.js';
import { SANDBOX_PARAMS } from './registry/seed.js';
import { gateCheck, strictnessFor } from './provenance/gate.js';
import { isAdmissibleInRigor, PROVENANCE } from './provenance/tags.js';
import { cleanFixture, inventedFixture, unregisteredFixture } from './testing/fixtures.js';

describe('provenance tags', () => {
  it('has exactly three', () => {
    expect(PROVENANCE).toEqual(['CALIBRATED', 'ESTIMATED', 'INVENTED']);
  });

  it('refuses INVENTED in Rigor', () => {
    expect(isAdmissibleInRigor('INVENTED')).toBe(false);
    expect(isAdmissibleInRigor('CALIBRATED')).toBe(true);
    expect(isAdmissibleInRigor('ESTIMATED')).toBe(true);
  });
});

describe('registry', () => {
  it('requires a source for CALIBRATED and ESTIMATED', () => {
    const registry = new ParamRegistry();
    expect(() =>
      registry.register({ key: 'a.b', unit: 'x', provenance: 'CALIBRATED' }),
    ).toThrow(/dataset reference/);
    expect(() =>
      registry.register({ key: 'a.c', unit: 'x', provenance: 'ESTIMATED' }),
    ).toThrow(/citation/);
  });

  it('requires a note for INVENTED, so a guess cannot be silent', () => {
    const registry = new ParamRegistry();
    expect(() =>
      registry.register({ key: 'a.d', unit: 'x', provenance: 'INVENTED' }),
    ).toThrow(/why this value was chosen/);
  });

  it('has no default provenance', () => {
    const registry = new ParamRegistry();
    expect(() => registry.register({ key: 'a.e', unit: 'x' })).toThrow();
  });

  it('throws on an unregistered lookup rather than assuming', () => {
    const registry = new ParamRegistry();
    expect(() => registry.provenanceOf('nope.nope')).toThrow(/not registered/);
  });

  it('rejects duplicates and inverted bounds', () => {
    const registry = new ParamRegistry();
    const decl = { key: 'a.f', unit: 'x', provenance: 'INVENTED', note: 'guess' };
    registry.register(decl);
    expect(() => registry.register(decl)).toThrow(/duplicate/);
    expect(() =>
      registry.register({ ...decl, key: 'a.g', bounds: { min: '2', max: '1' } }),
    ).toThrow(/bounds.min must not exceed/);
  });

  it('accepts the whole seeded sandbox set', () => {
    const registry = new ParamRegistry();
    registry.registerAll(SANDBOX_PARAMS);
    expect(registry.size).toBe(SANDBOX_PARAMS.length);
    expect(registry.byProvenance('INVENTED').length).toBe(SANDBOX_PARAMS.length);
    expect(registry.size).toBeGreaterThanOrEqual(30);
  });
});

describe('gate', () => {
  it('blocks a Rigor output with an INVENTED ancestor two hops upstream', () => {
    const fixture = inventedFixture();
    const report = gateCheck({
      mode: 'RIGOR',
      graph: fixture.graph,
      registry: fixture.registry,
      outputs: [fixture.output],
    });
    expect(report.status).toBe('BLOCKED');
    expect(report.violations[0]?.param).toBe('agriculture.yield.climate_sensitivity');
    expect(report.violations[0]?.path).toEqual([
      'population.count',
      'yield.perHectare',
      'agriculture.yield.climate_sensitivity',
    ]);
  });

  it('blocks an unregistered parameter', () => {
    const fixture = unregisteredFixture();
    const report = gateCheck({
      mode: 'RIGOR',
      graph: fixture.graph,
      registry: fixture.registry,
      outputs: [fixture.output],
    });
    expect(report.status).toBe('BLOCKED');
    expect(report.violations[0]?.reason).toBe('UNREGISTERED');
  });

  it('passes a clean Rigor run, so the gate is not simply refusing everything', () => {
    const fixture = cleanFixture();
    const report = gateCheck({
      mode: 'RIGOR',
      graph: fixture.graph,
      registry: fixture.registry,
    });
    expect(report.status).toBe('PASS');
    expect(report.violations).toEqual([]);
  });

  it('never blocks Sandbox, and always demands a watermark', () => {
    const fixture = inventedFixture();
    const report = gateCheck({
      mode: 'SANDBOX',
      graph: fixture.graph,
      registry: fixture.registry,
    });
    expect(report.status).toBe('PASS');
    expect(report.watermarkRequired).toBe(true);
  });

  it('reports BYPASSED, not PASS, when strictness is relaxed locally', () => {
    const fixture = inventedFixture();
    const report = gateCheck({
      mode: 'RIGOR',
      graph: fixture.graph,
      registry: fixture.registry,
      outputs: [fixture.output],
      env: { GENESIS_PROVENANCE_STRICT: 'false' },
    });
    expect(report.status).toBe('BYPASSED');
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it('cannot be disabled by config under NODE_ENV=production', () => {
    const fixture = inventedFixture();
    const report = gateCheck({
      mode: 'RIGOR',
      graph: fixture.graph,
      registry: fixture.registry,
      outputs: [fixture.output],
      env: { NODE_ENV: 'production', GENESIS_PROVENANCE_STRICT: 'false' },
    });
    expect(report.status).toBe('BLOCKED');
    expect(report.productionLocked).toBe(true);
  });

  it('locks strictness in production regardless of the flag value', () => {
    expect(strictnessFor({ NODE_ENV: 'production', GENESIS_PROVENANCE_STRICT: 'false' })).toEqual({
      strict: true,
      productionLocked: true,
    });
    expect(strictnessFor({ GENESIS_PROVENANCE_STRICT: 'false' })).toEqual({
      strict: false,
      productionLocked: false,
    });
    expect(strictnessFor({})).toEqual({ strict: true, productionLocked: false });
  });
});
