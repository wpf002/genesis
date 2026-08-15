import { describe, expect, it } from 'vitest';
import { KERNEL_VERSION } from '@genesis/kernel';
import { OverrideRejected, SandboxParams } from '@genesis/models';
import {
  base64UrlDecode,
  base64UrlEncode,
  baselineOf,
  chronicle,
  conditionFrames,
  tableFromRun,
  formatYear,
  canonicalConfig,
  configHash,
  decodePermalink,
  encodePermalink,
  headlineKeysFor,
  packById,
  readSeries,
  parseScenario,
  PermalinkCorrupt,
  publish,
  reproduce,
  runScenario,
  SCENARIO_FORMAT,
  SCENARIO_PACKS,
  ScenarioInvalid,
  verifyPermalink,
  workUnits,
  type Scenario,
} from './index.js';

function scenario(patch: Record<string, unknown> = {}): Scenario {
  return parseScenario({
    format: SCENARIO_FORMAT,
    id: 'test',
    title: 'Test',
    mode: 'SANDBOX',
    seed: '1',
    ticks: 60,
    ...patch,
  });
}

describe('scenario format', () => {
  it('rejects an unknown region rather than running a nameless one', () => {
    expect(() => scenario({ regions: ['ZZZ'] })).toThrow(ScenarioInvalid);
  });

  it('rejects two interventions on one key at one tick', () => {
    expect(() =>
      scenario({
        interventions: [
          { tick: 10, stateKey: 'demography.population', value: '1', rationale: 'a' },
          { tick: 10, stateKey: 'demography.population', value: '2', rationale: 'b' },
        ],
      }),
    ).toThrow(/two interventions target/);
  });

  it('rejects an intervention at or after the end of the run', () => {
    expect(() =>
      scenario({
        ticks: 60,
        interventions: [
          { tick: 60, stateKey: 'demography.population', value: '1', rationale: 'a' },
        ],
      }),
    ).toThrow(/at or after the run's end/);
  });

  it('rejects an intervention with no rationale', () => {
    expect(() =>
      scenario({
        interventions: [
          { tick: 10, stateKey: 'demography.population', value: '1', rationale: '' },
        ],
      }),
    ).toThrow(ScenarioInvalid);
  });

  it('refuses an intervention that changes nothing', () => {
    const before = runScenario(scenario({ ticks: 20 })).run.get('demography.population');
    const noop = scenario({
      ticks: 40,
      interventions: [
        {
          tick: 20,
          stateKey: 'demography.population',
          value: before.toString().replace(/(\d{6})$/, '.$1'),
          rationale: 'writes the value that is already there',
        },
      ],
    });
    expect(() => runScenario(noop)).toThrow(/changes nothing/);
  });
});

describe('config hash', () => {
  it('ignores the title and the note, which describe a run but do not determine one', () => {
    const a = scenario({ title: 'One', note: 'first' });
    const b = scenario({ title: 'Two', note: 'second' });
    expect(configHash(a)).toBe(configHash(b));
  });

  it('changes when an override changes', () => {
    const a = scenario();
    const b = scenario({ overrides: { 'demography.fertility.baseline': '2.4' } });
    expect(configHash(a)).not.toBe(configHash(b));
  });

  it('does not depend on the order overrides were written in', () => {
    const a = scenario({
      overrides: { 'demography.fertility.baseline': '2.4', 'economy.capital.depreciation': '0.06' },
    });
    const b = scenario({
      overrides: { 'economy.capital.depreciation': '0.06', 'demography.fertility.baseline': '2.4' },
    });
    expect(canonicalConfig(a)).toBe(canonicalConfig(b));
  });

  it('is printable, so two people can diff what they ran', () => {
    expect(canonicalConfig(scenario({ regions: ['EGY', 'CHN'] }))).toContain('regions EGY,CHN');
  });
});

describe('param overrides', () => {
  it('refuses a key nobody registered', () => {
    expect(() => new SandboxParams({ 'agriculture.made.up': '1' })).toThrow(OverrideRejected);
  });

  it('refuses a value outside the declared bounds', () => {
    // agriculture.yield.tfp_exponent is declared with bounds [0.1, 0.9].
    expect(() => new SandboxParams({ 'agriculture.yield.tfp_exponent': '1.5' })).toThrow(
      /outside declared bounds/,
    );
    expect(() => new SandboxParams({ 'agriculture.yield.tfp_exponent': '0.5' })).not.toThrow();
  });

  it('refuses a value that is not an exact decimal', () => {
    expect(() => new SandboxParams({ 'demography.fertility.baseline': '2.1e3' })).toThrow(
      /not an exact decimal/,
    );
  });

  it('marks an overridden parameter INVENTED, whatever the registry said', () => {
    const params = new SandboxParams({ 'demography.fertility.baseline': '2.4' });
    const factor = params.factor('demography.fertility.baseline', params.get('demography.fertility.baseline'));
    expect(factor.provenance).toBe('INVENTED');
  });

  it('gives the same paramSetId to two runs that reach the same numbers', () => {
    const untouched = new SandboxParams();
    const restated = new SandboxParams({ 'demography.fertility.baseline': '2.1' });
    expect(restated.paramSetId()).toBe(untouched.paramSetId());
    expect(new SandboxParams({ 'demography.fertility.baseline': '2.4' }).paramSetId()).not.toBe(
      untouched.paramSetId(),
    );
  });
});

describe('base64url', () => {
  it('round-trips every payload length modulo 3', () => {
    for (let length = 0; length < 32; length += 1) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 255);
      expect([...base64UrlDecode(base64UrlEncode(bytes))]).toEqual([...bytes]);
    }
  });

  it('emits nothing outside the url-safe alphabet', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(base64UrlEncode(bytes)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('permalinks', () => {
  it('round-trips a scenario through a string', () => {
    const original = scenario({
      note: 'unicode survives: café — ✓',
      regions: ['EGY'],
      overrides: { 'demography.fertility.baseline': '2.4' },
      interventions: [
        { tick: 10, stateKey: 'EGY:demography.population', value: '2000', rationale: 'why' },
      ],
    });
    expect(decodePermalink(encodePermalink(original))).toEqual(original);
  });

  it('rejects a damaged token instead of decoding a different run', () => {
    const token = encodePermalink(scenario());
    const damaged = token.slice(0, -3) + 'aaa';
    expect(() => decodePermalink(damaged)).toThrow(PermalinkCorrupt);
  });

  it('rejects a payload edited without fixing the checksum', () => {
    const [version, payload, checksum] = encodePermalink(scenario()).split('.') as [
      string,
      string,
      string,
    ];
    const edited = `${version}.${payload.slice(0, -4)}QQQQ.${checksum}`;
    expect(() => decodePermalink(edited)).toThrow(/checksum/);
  });

  it('rejects a token from a format this build does not read', () => {
    const token = encodePermalink(scenario());
    expect(() => decodePermalink(`g9.${token.split('.')[1] as string}.000000000000`)).toThrow(
      /unknown version/,
    );
  });

  it('rejects a token that is not three parts', () => {
    expect(() => decodePermalink('nonsense')).toThrow(PermalinkCorrupt);
  });
});

describe('the Phase 8 exit gate', () => {
  it('reproduces a published run from the token alone', () => {
    const published = publish(
      scenario({
        ticks: 120,
        overrides: { 'demography.fertility.baseline': '2.4' },
        interventions: [
          { tick: 40, stateKey: 'agriculture.storage', value: '5', rationale: 'a full granary' },
        ],
      }),
    );

    // Everything a third party gets is these two strings. Nothing else crosses.
    const token: string = published.token;
    const claimed: string = published.terminalHash;

    const check = verifyPermalink(token, claimed);
    expect(check.reproduced).toBe(true);
    expect(check.actual).toBe(claimed);
    expect(check.kernelVersion).toBe(KERNEL_VERSION);
  });

  it('reports a mismatch rather than passing a hash that does not match', () => {
    const published = publish(scenario());
    const check = verifyPermalink(published.token, '0'.repeat(64));
    expect(check.reproduced).toBe(false);
    expect(check.actual).toBe(published.terminalHash);
  });

  it('carries the three inputs locked invariant #5 names', () => {
    const published = publish(scenario());
    expect(published.seed).toBe('1');
    expect(published.configHash).toMatch(/^[0-9a-f]{64}$/);
    expect(published.paramSetId).toMatch(/^[0-9a-f]{16}$/);
  });
});

// The two full-world packs are ~900,000 tick-regions each and take about half a
// minute to execute. Tests that must run every pack run the affordable ones and
// name the ones they did not, because a silent cap reads as full coverage.
const AFFORDABLE = 200_000;
const affordable = SCENARIO_PACKS.filter((p) => workUnits(p) <= AFFORDABLE);
const expensive = SCENARIO_PACKS.filter((p) => workUnits(p) > AFFORDABLE);

describe('scenario packs', () => {
  it('says which packs are too expensive to execute in a unit test', () => {
    // Not a skip: this asserts the split is what it is supposed to be, so a pack
    // silently becoming unaffordable shows up here.
    expect(expensive.map((p) => p.id)).toEqual(['all-of-it', 'no-plague']);
    expect(affordable.length).toBe(SCENARIO_PACKS.length - expensive.length);
  });

  it('round-trips the expensive packs through a permalink without running them', () => {
    for (const pack of expensive) {
      expect(decodePermalink(encodePermalink(pack))).toEqual(pack);
    }
  });
  it('ships ten of them, all Sandbox and all watermark-required', () => {
    expect(SCENARIO_PACKS).toHaveLength(10);
    for (const pack of SCENARIO_PACKS) expect(pack.mode).toBe('SANDBOX');
    for (const pack of affordable) expect(publish(pack).watermarkRequired).toBe(true);
  });

  it('has unique ids', () => {
    expect(new Set(SCENARIO_PACKS.map((p) => p.id)).size).toBe(SCENARIO_PACKS.length);
  });

  it('every pack reproduces from its own permalink', () => {
    for (const pack of affordable) {
      const published = publish(pack);
      expect(reproduce(published.token).terminalHash).toBe(published.terminalHash);
    }
  });

  // The guard that caught the first draft of plague-arrival: it intervened on
  // disease_spatial.importPressure, which disease_spatial recomputes from scratch
  // before any reader sees it, so the pack ran and returned the baseline hash.
  it('every pack that touches something actually changes the run', () => {
    for (const pack of affordable) {
      const touches =
        Object.keys(pack.overrides).length > 0 || pack.interventions.length > 0;
      if (!touches) continue;
      const changed = publish(pack).terminalHash;
      const untouched = publish(baselineOf(pack)).terminalHash;
      expect(changed, `${pack.id} reproduced the baseline hash - its edits did nothing`).not.toBe(
        untouched,
      );
    }
  });

  it('no two packs are the same run wearing different names', () => {
    const seen = new Map<string, string>();
    for (const pack of affordable) {
      const hash = publish(pack).terminalHash;
      expect(seen.has(hash), `${pack.id} and ${seen.get(hash)} are the same run`).toBe(false);
      seen.set(hash, pack.id);
    }
  });

  it('reads plottable series out of the ledger without a second run', () => {
    const pack = packById('soil-exhaustion') as Scenario;
    const keys = ['demography.population', 'agriculture.soilQuality'];
    const scenario = readSeries(runScenario(pack).run, keys, 60);
    const baseline = readSeries(runScenario(baselineOf(pack)).run, keys, 60);

    for (const series of scenario) {
      expect(series.samples.length).toBeLessThanOrEqual(61);
      // The end of a run is the part nobody wants dropped by a stride.
      expect(series.samples[series.samples.length - 1]?.tick).toBe(pack.ticks);
      expect(series.min).toBeLessThanOrEqual(series.max);
    }

    // Both runs start identical and the scenario ends far below its baseline.
    expect(scenario[0]?.samples[0]?.exact).toBe(baseline[0]?.samples[0]?.exact);
    const endedAt = (s: typeof scenario) => Number(s[0]?.samples[s[0].samples.length - 1]?.exact);
    expect(endedAt(scenario)).toBeLessThan(endedAt(baseline) / 2);
  });

  it('gives every headline key a series in a flat run', () => {
    const run = runScenario(packById('baseline') as Scenario).run;
    for (const series of readSeries(run, headlineKeysFor(''))) {
      expect(series.samples.length, series.stateKey).toBeGreaterThan(0);
    }
  });

  it('gives every headline key a series in each region of a spatial run', () => {
    const pack = packById('six-regions') as Scenario;
    const run = runScenario(pack).run;
    for (const region of pack.regions) {
      for (const series of readSeries(run, headlineKeysFor(region))) {
        expect(series.samples.length, series.stateKey).toBeGreaterThan(0);
      }
    }
  });

  it('names fewer plagues in the timeline where the plague never comes', () => {
    // Guards a real bug: the thresholds were percentiles of each region's own
    // distribution, so a world with almost no disease still had a top five
    // percent, and "the plague never comes" reported MORE plagues than the
    // baseline. Disease burden is a share of the population, not a rank.
    const withPlague = packById('six-regions') as Scenario;
    const without = parseScenario({
      ...(packById('six-regions') as Scenario),
      id: 'six-regions-no-plague',
      overrides: {
        'disease.seird.beta_baseline': '0.035',
        'disease.spatial.coupling_strength': '0.005',
      },
    });

    const plagues = (pack: Scenario) =>
      chronicle(tableFromRun(runScenario(pack).run, pack.regions)).filter(
        (event) => event.headline === 'Plague spreads',
      ).length;

    expect(plagues(withPlague)).toBeGreaterThan(0);
    expect(plagues(without)).toBe(0);
  });

  it('paints a map that is mostly quiet, so a flash of colour means something', () => {
    const pack = packById('six-regions') as Scenario;
    const frames = conditionFrames(tableFromRun(runScenario(pack).run, pack.regions));
    const cells = frames.flatMap((frame) => frame.regions);
    const steady = cells.filter((c) => c.state === 'steady').length / cells.length;

    // The first version painted every region "famine" for the whole run because
    // the cutoff sat above where food ratio actually lives.
    expect(steady).toBeGreaterThan(0.6);
    expect(steady).toBeLessThan(0.98);
    expect(new Set(cells.map((c) => c.state)).size).toBeGreaterThanOrEqual(4);
  });

  it('starts the clock in 3000 BC and reaches the present', () => {
    const pack = packById('six-regions') as Scenario;
    const frames = conditionFrames(tableFromRun(runScenario(pack).run, pack.regions));
    expect(formatYear(frames[0]?.year ?? 0)).toMatch(/BC$/);
    expect(frames[frames.length - 1]?.year).toBe(-3000 + pack.ticks);
    expect(formatYear(2000)).toBe('AD 2000');
  });

  it('looks packs up by id', () => {
    expect(packById('baseline')?.title).toBe('Baseline');
    expect(packById('not-a-pack')).toBeUndefined();
  });
});
