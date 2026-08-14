import { describe, expect, it } from 'vitest';
import { Fx, Run, terminalHash } from '@genesis/kernel';
import { buildDependencyGraph, gateCheck, ParamRegistry, SANDBOX_PARAMS } from '@genesis/params';
import { MODULE_ORDER, SandboxParams, sandboxModules } from './index.js';

const SEED = 20260806n;
const options = () => ({ seed: SEED, modules: sandboxModules() });

describe('sandbox parameters', () => {
  it('has a value for every declared parameter', () => {
    expect(new SandboxParams().missingValues()).toEqual([]);
  });

  it('has no value that was never declared', () => {
    expect(new SandboxParams().undeclaredValues()).toEqual([]);
  });

  it('refuses a constant nobody registered', () => {
    expect(() => new SandboxParams().get('made.up.key')).toThrow(/not registered/);
  });

  it('carries the declared provenance rather than guessing it', () => {
    const factor = new SandboxParams().factor('agriculture.soil.depletion_rate', Fx.ONE);
    expect(factor.provenance).toBe('INVENTED');
  });
});

describe('module order', () => {
  it('matches the declared order exactly', () => {
    expect(sandboxModules().map((m) => m.id)).toEqual([...MODULE_ORDER]);
  });
});

describe('determinism', () => {
  it('is reproducible from the seed', () => {
    expect(terminalHash(options(), 500)).toBe(terminalHash(options(), 500));
  });

  it('diverges on a different seed', () => {
    expect(terminalHash(options(), 500)).not.toBe(
      terminalHash({ seed: SEED + 1n, modules: sandboxModules() }, 500),
    );
  });

  it('survives snapshot and restore mid-run', () => {
    const straight = new Run(options());
    straight.advanceTo(120);
    const snapshot = straight.snapshot();
    straight.advanceTo(500);

    const restored = new Run(options());
    restored.restore(snapshot);
    restored.advanceTo(500);
    expect(restored.stateHash()).toBe(straight.stateHash());
  });

  it('holds no float in state', () => {
    const run = new Run(options());
    run.advanceTo(200);
    for (const entry of run.entries()) {
      expect(typeof Fx.raw(entry.value)).toBe('bigint');
    }
  });
});

describe('the gate refuses to promote any of this', () => {
  it('blocks every sandbox output in Rigor mode', () => {
    const run = new Run(options());
    run.advanceTo(50);

    const registry = new ParamRegistry();
    registry.registerAll(SANDBOX_PARAMS);
    const graph = buildDependencyGraph(run.ledger.all());

    const report = gateCheck({ mode: 'RIGOR', graph, registry });
    expect(report.status).toBe('BLOCKED');
    // Every declared output is refused, not just the first one found.
    expect(report.violations.length).toBe(report.outputs.length);
    for (const violation of report.violations) expect(violation.reason).toBe('INVENTED');
  });

  it('passes in Sandbox mode but always demands a watermark', () => {
    const run = new Run(options());
    run.advanceTo(50);
    const registry = new ParamRegistry();
    registry.registerAll(SANDBOX_PARAMS);
    const report = gateCheck({
      mode: 'SANDBOX',
      graph: buildDependencyGraph(run.ledger.all()),
      registry,
    });
    expect(report.status).toBe('PASS');
    expect(report.watermarkRequired).toBe(true);
  });
});

describe('unregistered constants', () => {
  // Was 47 against 33 registered parameters when the 18th subsystem landed.
  // 35 of them were behavioural knobs the gate could not see; those are now
  // declared. The 7 that remain are structural and are not parameters: percent
  // conversions, divide-by-zero guards, and the 2 in "uniform on [-1,1)".
  //
  // This budget only ever goes down.
  const BUDGET = 7;

  it('does not grow the inline-literal count', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = new URL('./sandbox/', import.meta.url).pathname;

    let count = 0;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(join(dir, file), 'utf8');
      count += (source.match(/Fx\.parse\('[0-9.]+'\)|Fx\.fromInt\([0-9]+\)/g) ?? []).length;
    }
    expect(count).toBeLessThanOrEqual(BUDGET);
  });
});

describe('multi-region runs', () => {
  it('gives every region its own 18 subsystems', async () => {
    const { REGIONS, worldModules } = await import('./index.js');
    expect(worldModules().length).toBe(REGIONS.length * MODULE_ORDER.length);
  });

  it('keeps regions independent: same modules, different draws', async () => {
    const { REGIONS, worldModules } = await import('./index.js');
    const run = new Run({ seed: SEED, modules: worldModules() });
    run.advanceTo(200);
    const pops = REGIONS.map((r) => Fx.toString(run.get(`${r}:demography.population`)));
    expect(new Set(pops).size).toBe(REGIONS.length);
  });

  it('is deterministic across the whole world', async () => {
    const { worldModules } = await import('./index.js');
    const hash = () => {
      const r = new Run({ seed: SEED, modules: worldModules() });
      r.advanceTo(200);
      return r.stateHash();
    };
    expect(hash()).toBe(hash());
  });
});
