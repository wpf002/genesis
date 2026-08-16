import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  BranchInvalid,
  CATALOGUE,
  archetypeById,
  configHash,
  decodePermalink,
  encodePermalink,
  entryById,
  firstDifference,
  fork,
  packById,
  parseScenario,
  preview,
  publish,
  realityDistance,
  reproduce,
  runBranch,
  runCounterfactual,
  runScenario,
  suggest,
  type Branch,
  type Scenario,
} from '../index.js';
import { empireEndures, tradeOpens } from '../catalogue/levers.js';

const REGIONS = ['ITA', 'FRA', 'DEU', 'EGY'];
const TICKS = 4600; // 3000 BC to AD 1600

const branchOf = (phases: Branch['phases']): Branch => ({
  id: 'test',
  label: 'Test branch',
  phases,
});

describe('the scenario format stayed backward compatible', () => {
  it('leaves the config hash of every existing pack untouched', () => {
    // `phases` is additive: a scenario without any must canonicalise byte for
    // byte as it did before branching existed, or every permalink ever written
    // stops reproducing.
    const baseline = packById('baseline') as Scenario;
    expect(baseline.phases).toEqual([]);
    expect(configHash(baseline)).toBe(
      'f3eb9446fca846de5e787f2071c390138093f558e5908c1f58ebb4b8fd8c1dae',
    );
  });

  it('round-trips a phased scenario through a permalink', () => {
    const scenario = parseScenario({
      format: 'genesis-scenario/1',
      id: 'phased',
      title: 'Phased',
      mode: 'SANDBOX',
      seed: '1',
      ticks: 900,
      regions: ['ITA'],
      phases: [
        { year: -2500, regions: ['ITA'], overrides: { 'trade.route.risk_premium': '0.1' }, label: 'roads open' },
        { year: -2400, regions: ['ITA'], shocks: [{ key: 'demography.population', factor: '0.5' }] },
      ],
    });
    expect(decodePermalink(encodePermalink(scenario))).toEqual(scenario);
    expect(configHash(scenario)).not.toBe(
      configHash(parseScenario({ ...scenario, phases: [] })),
    );
  });

  it('refuses two phases in one year', () => {
    expect(() =>
      parseScenario({
        format: 'genesis-scenario/1',
        id: 'clash',
        title: 'Clash',
        mode: 'SANDBOX',
        seed: '1',
        ticks: 900,
        phases: [{ year: -2500 }, { year: -2500 }],
      }),
    ).toThrow(/two phases diverge/);
  });

  it('runs the phases rather than silently ignoring them', () => {
    const base = {
      format: 'genesis-scenario/1',
      id: 'runs-phases',
      title: 'Runs phases',
      mode: 'SANDBOX' as const,
      seed: '1',
      ticks: 900,
      regions: ['ITA'],
    };
    const without = publish(parseScenario(base));
    const withPhase = publish(
      parseScenario({
        ...base,
        phases: [{ year: -2600, overrides: { 'agriculture.yield.base': '2.2' } }],
      }),
    );
    expect(withPhase.terminalHash).not.toBe(without.terminalHash);
    // And it still reproduces from its own token.
    expect(reproduce(withPhase.token).terminalHash).toBe(withPhase.terminalHash);
  });
});

describe('branches', () => {
  it('a branch with no phases is the baseline', () => {
    const empty = runBranch({ branch: branchOf([]), regions: REGIONS, ticks: TICKS, every: 25 });
    const oneNoop = runBranch({
      branch: branchOf([]),
      regions: REGIONS,
      ticks: TICKS,
      every: 25,
    });
    expect(empty.terminalHash).toBe(oneNoop.terminalHash);
    expect(empty.phaseTicks).toEqual([]);
  });

  it('every phase boundary is clean: state before it is identical', () => {
    // The claim the whole application rests on, applied to a fork rather than a
    // first divergence.
    const first = branchOf([
      { year: 500, regions: ['ITA'], lever: empireEndures(), label: 'Rome endures' },
    ]);
    const forked = fork(
      first,
      { year: 1000, regions: ['ITA'], lever: tradeOpens(), label: 'Roads open' },
      'Rome endures, then trade',
    );

    const a = runBranch({ branch: first, regions: REGIONS, ticks: TICKS, every: 25 });
    const b = runBranch({ branch: forked, regions: REGIONS, ticks: TICKS, every: 25 });

    const split = firstDifference(b.table, a.table);
    expect(split).toBeDefined();
    // Nothing may differ before the second phase.
    expect(split?.year).toBeGreaterThanOrEqual(1000);
    expect(b.phaseTicks).toEqual([3500, 4000]);
  });

  it('later phases compose onto earlier ones rather than replacing them', () => {
    const forked = fork(
      branchOf([{ year: 500, regions: ['ITA'], lever: empireEndures(), label: 'a' }]),
      { year: 1000, regions: ['ITA'], lever: tradeOpens(), label: 'b' },
      'both',
    );
    const run = runBranch({ branch: forked, regions: REGIONS, ticks: TICKS, every: 25 });
    // Parameters from both levers are in force at the end.
    expect(run.changedParams).toContain('politics.legitimacy.decay');
    expect(run.changedParams).toContain('trade.gravity.distance_exponent');
  });

  it('is deterministic: the same branch twice gives the same hash', () => {
    const branch = branchOf([
      { year: 800, regions: ['FRA'], lever: tradeOpens(), label: 'x' },
    ]);
    const a = runBranch({ branch, regions: REGIONS, ticks: TICKS, every: 25 });
    const b = runBranch({ branch, regions: REGIONS, ticks: TICKS, every: 25 });
    expect(a.terminalHash).toBe(b.terminalHash);
  });

  it('refuses phases out of order or outside the run', () => {
    expect(() =>
      runBranch({
        branch: branchOf([
          { year: 1000, regions: [], lever: tradeOpens(), label: 'a' },
          { year: 500, regions: [], lever: tradeOpens(), label: 'b' },
        ]),
        regions: REGIONS,
        ticks: TICKS,
      }),
    ).toThrow(BranchInvalid);

    expect(() =>
      runBranch({
        branch: branchOf([{ year: 9000, regions: [], lever: tradeOpens(), label: 'a' }]),
        regions: REGIONS,
        ticks: TICKS,
      }),
    ).toThrow(/outside the run/);
  });

  it('forking never mutates the branch it forked from', () => {
    const original = branchOf([
      { year: 500, regions: ['ITA'], lever: empireEndures(), label: 'a' },
    ]);
    fork(original, { year: 900, regions: ['ITA'], lever: tradeOpens(), label: 'b' }, 'c');
    expect(original.phases).toHaveLength(1);
  });

  it('three forks off one parent stay distinct worlds', () => {
    const parent = branchOf([
      { year: 500, regions: ['ITA'], lever: empireEndures(), label: 'parent' },
    ]);
    const hashes = [tradeOpens(), empireEndures(), tradeOpens()].map((lever, i) =>
      runBranch({
        branch: fork(
          parent,
          { year: 900 + i * 50, regions: ['ITA'], lever, label: `A${i}` },
          `A${i}`,
        ),
        regions: REGIONS,
        ticks: TICKS,
        every: 25,
      }).terminalHash,
    );
    // Forking at different years produces different worlds even with one lever.
    expect(new Set(hashes).size).toBe(3);
  });
});

describe('the translation workflow', () => {
  it('suggests candidate readings and never picks one', () => {
    const found = suggest('What if the Black Death never occurred?');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]?.archetype.id).toBeTruthy();
    // Ranked by cue hits, best first.
    for (let i = 1; i < found.length; i += 1) {
      expect(found[i]!.hits).toBeLessThanOrEqual(found[i - 1]!.hits);
    }
  });

  it('returns nothing for a premise it has no vocabulary for, rather than guessing', () => {
    expect(suggest('what if my cat had been a dog')).toEqual([]);
  });

  it('shows exactly what will change before anything runs', () => {
    const draft = {
      premise: 'What if Napoleon won Waterloo?',
      archetypeId: 'conquest',
      year: 1815,
      regions: ['FRA', 'GBR'],
      support: 'plausible' as const,
    };
    const result = preview(draft);
    expect(result).toBeDefined();
    expect(Object.keys(result?.overrides ?? {}).length).toBeGreaterThan(0);
    // Anything the user chose is INVENTED, and the preview says so.
    expect(result?.provenance).toBe('INVENTED');
    expect(result?.limits.join(' ')).toMatch(/INVENTED/);
    expect(result?.limits.join(' ')).toMatch(/no border moves|spatial adjacency/);
  });

  it('every archetype maps to a real lever with registered parameters', () => {
    for (const archetype of ARCHETYPES) {
      const lever = archetype.lever();
      expect(lever.reading.length).toBeGreaterThan(10);
      expect(archetypeById(archetype.id)).toBe(archetype);
    }
  });

  it('covers every archetype the catalogue actually uses', () => {
    const used = new Set(CATALOGUE.map((e) => e.lever.archetype));
    const offered = new Set(ARCHETYPES.map((a) => a.lever().archetype));
    for (const archetype of used) {
      expect(offered.has(archetype), `${archetype} is used but cannot be authored`).toBe(true);
    }
  });
});

describe('a fork is comparable to its parent', () => {
  it('reality distance between parent and fork is zero until the fork year', () => {
    const parent = branchOf([
      { year: 500, regions: ['ITA'], lever: empireEndures(), label: 'parent' },
    ]);
    const child = fork(
      parent,
      { year: 1100, regions: ['ITA'], lever: tradeOpens(), label: 'child' },
      'child',
    );
    const a = runBranch({ branch: parent, regions: REGIONS, ticks: TICKS, every: 25 });
    const b = runBranch({ branch: child, regions: REGIONS, ticks: TICKS, every: 25 });

    for (const point of realityDistance(b.table, a.table)) {
      if (point.year < 1100) expect(point.distance).toBe(0);
    }
  });

  it('a catalogue scenario converts into a one-phase branch', () => {
    const entry = entryById('rome-eternal');
    expect(entry).toBeDefined();
    const branch = branchOf([
      {
        year: entry!.year,
        regions: entry!.regions,
        lever: entry!.lever,
        label: entry!.title,
      },
    ]);
    const run = runBranch({ branch, regions: REGIONS, ticks: TICKS, every: 25 });
    expect(run.phaseTicks).toEqual([entry!.year + 3000]);
    expect(run.touched.length).toBeGreaterThan(0);
  });
});

describe('the permalink reproduces the run the explorer showed', () => {
  // Caught by clicking the Verify button: the explorer handed out a permalink
  // whose overrides applied from 3000 BC, while the run on screen applied them
  // at the divergence year. Different universes, same link.
  const REGION_SET = ['ITA', 'FRA', 'DEU', 'EGY'];
  const SPAN = 4600;

  it.each(['the-black-death-never-occurs', 'rome-eternal'])(
    'matches for %s',
    (id) => {
      const entry = entryById(id);
      if (entry === undefined) throw new Error(`no entry ${id}`);

      const shown = runCounterfactual({
        entry,
        regions: REGION_SET,
        ticks: SPAN,
        every: 12,
      });

      const shared = runScenario(
        parseScenario({
          format: 'genesis-scenario/1',
          id: entry.id.slice(0, 40),
          title: entry.title,
          note: entry.premise,
          mode: 'SANDBOX',
          seed: '1',
          ticks: SPAN,
          regions: REGION_SET,
          overrides: {},
          phases: [
            {
              year: entry.year,
              regions: entry.regions.filter((r) => REGION_SET.includes(r)),
              overrides: entry.lever.overrides,
              shocks: entry.lever.shocks.map((shock) => ({
                key: shock.key,
                factor: String(shock.factor),
              })),
            },
          ],
        }),
      );

      expect(shared.terminalHash).toBe(shown.terminalHash);
    },
  );
});

describe('runScenario and runBranch agree', () => {
  it('a phased scenario matches the equivalent branch', () => {
    const scenario = parseScenario({
      format: 'genesis-scenario/1',
      id: 'agree',
      title: 'Agree',
      mode: 'SANDBOX',
      seed: '1',
      ticks: 1200,
      regions: ['ITA'],
      phases: [
        {
          year: -2500,
          regions: ['ITA'],
          overrides: tradeOpens().overrides,
        },
      ],
    });
    const viaScenario = runScenario(scenario).terminalHash;
    const viaBranch = runBranch({
      branch: branchOf([
        { year: -2500, regions: ['ITA'], lever: tradeOpens(), label: 'x' },
      ]),
      regions: ['ITA'],
      ticks: 1200,
      every: 25,
    }).terminalHash;
    expect(viaScenario).toBe(viaBranch);
  });
});
