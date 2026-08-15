// The scenario engine's report.
//
// Point of Divergence -> Immediate -> 5 years -> 25 years -> Century -> 2026,
// then the cross-cutting sections: geopolitical map, wars and alliances,
// economy, technology, religion and culture, everyday life, second and
// third-order effects.
//
// Every number here is read out of the two runs. Nothing is narrated that was
// not simulated, and the three confidence tiers are the honest part:
//
//   HIGH          a simulated quantity in a country the lever was applied to
//   EXTRAPOLATION a simulated quantity somewhere the lever was NOT applied, which
//                 moved anyway - the engine's actual second-order finding
//   SPECULATIVE   asked for, and outside anything the engine models. Named
//                 rather than invented.

import { formatYear, yearOf } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import type { CatalogueEntry } from './entries.js';
import { LAST_OBSERVED_YEAR, tickOfYear } from './engine.js';

export type Confidence = 'high' | 'extrapolation' | 'speculative';

export interface Finding {
  readonly label: string;
  readonly value: string;
  readonly confidence: Confidence;
}

export interface Stage {
  readonly title: string;
  readonly year: number | null;
  readonly summary: string;
  readonly findings: readonly Finding[];
}

export interface Expansion {
  readonly entry: CatalogueEntry;
  readonly stages: readonly Stage[];
  readonly movers: readonly {
    region: string;
    change: number;
    baseline: number;
    counterfactual: number;
    targeted: boolean;
  }[];
  readonly speculative: readonly string[];
}

const KEY = {
  population: 'demography.population',
  food: 'demography.foodRatio',
  infectious: 'disease_seird.infectious',
  legitimacy: 'politics_legitimacy.legitimacy',
  adopted: 'technology_adoption.adopted',
} as const;

function indexOfTick(table: SampleTable, tick: number): number {
  let best = 0;
  for (let i = 0; i < table.ticks.length; i += 1) {
    if ((table.ticks[i] as number) <= tick) best = i;
    else break;
  }
  return best;
}

function read(table: SampleTable, region: string, key: string, index: number): number {
  return table.values.get(`${region}:${key}`)?.[index] ?? 0;
}

function total(table: SampleTable, key: string, index: number): number {
  let sum = 0;
  for (const region of table.regions) sum += read(table, region, key, index);
  return sum;
}

function mean(table: SampleTable, key: string, index: number): number {
  return table.regions.length === 0 ? 0 : total(table, key, index) / table.regions.length;
}

const pct = (a: number, b: number): string => {
  if (b === 0) return a === 0 ? 'no change' : 'up from nothing';
  const change = ((a - b) / b) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(change > -10 && change < 10 ? 1 : 0)}%`;
};

const people = (n: number): string => Math.round(n).toLocaleString('en-US');

/** One horizon: what the two worlds look like N years after the divergence. */
function horizon(
  title: string,
  year: number,
  counter: SampleTable,
  base: SampleTable,
  touched: readonly string[],
): Stage {
  const tick = tickOfYear(year);
  const ci = indexOfTick(counter, tick);
  const bi = indexOfTick(base, tick);

  const touchedSet = new Set(touched);
  const sumOver = (table: SampleTable, index: number, only: boolean) => {
    let sum = 0;
    for (const region of table.regions) {
      if (only !== touchedSet.has(region)) continue;
      sum += read(table, region, KEY.population, index);
    }
    return sum;
  };

  const worldC = total(counter, KEY.population, ci);
  const worldB = total(base, KEY.population, bi);
  const inC = sumOver(counter, ci, true);
  const inB = sumOver(base, bi, true);
  const outC = sumOver(counter, ci, false);
  const outB = sumOver(base, bi, false);

  return {
    title,
    year,
    summary: `World population ${pct(worldC, worldB)} against the timeline that happened.`,
    findings: [
      {
        label: 'People, where it happened',
        value: `${people(inC)} vs ${people(inB)} (${pct(inC, inB)})`,
        confidence: 'high',
      },
      {
        label: 'People, everywhere else',
        value: `${people(outC)} vs ${people(outB)} (${pct(outC, outB)})`,
        confidence: 'extrapolation',
      },
      {
        label: 'Food per head',
        value: `${mean(counter, KEY.food, ci).toFixed(2)} vs ${mean(base, KEY.food, bi).toFixed(2)}`,
        confidence: 'high',
      },
      {
        label: 'State authority',
        value: `${mean(counter, KEY.legitimacy, ci).toFixed(2)} vs ${mean(base, KEY.legitimacy, bi).toFixed(2)}`,
        confidence: 'high',
      },
      {
        label: 'Technology adopted',
        value: `${(mean(counter, KEY.adopted, ci) * 100).toFixed(0)}% vs ${(mean(base, KEY.adopted, bi) * 100).toFixed(0)}%`,
        confidence: 'high',
      },
      {
        label: 'Share of the world infectious',
        value: `${(mean(counter, KEY.infectious, ci) * 100).toFixed(2)}% vs ${(mean(base, KEY.infectious, bi) * 100).toFixed(2)}%`,
        confidence: 'high',
      },
    ],
  };
}

/** What the engine was asked for and cannot model. Named, never invented. */
const SPECULATIVE_BY_ARCHETYPE: Record<string, readonly string[]> = {
  conquest: [
    'Order of battle, campaign routes and casualty figures — the conflict subsystem carries force strength and reach, not units or fronts.',
    'Borders. The map colours whole countries; it has no mechanism for a frontier moving.',
  ],
  'conquest fails': [
    'Order of battle and campaign detail — strength and reach exist, formations do not.',
  ],
  'empire endures': ['Succession rules, legal systems and administrative structure.'],
  'empire breaks': ['Which successor states form, and where the lines fall.'],
  'plague averted': ['Which pathogen, and its clinical course.'],
  'plague worse': ['Which pathogen, and its clinical course.'],
  'technology early': [
    'Which specific inventions arrive, and in what order. The technology subsystem carries a diffusion stock and an adoption fraction, not a tree.',
  ],
  'technology lost': ['Which specific inventions are missing.'],
  'trade opens': ['Named routes, ports and commodities.'],
  'trade closes': ['Named routes, ports and commodities.'],
  industrialise: ['Sector composition, firms, and labour organisation.'],
  'cultural turn': [
    'Which religion or ideology wins. The culture subsystem carries two competing traditions and a churn rate, and does not know what either of them believes.',
  ],
  'internal strife': ['Factions, parties and named political actors.'],
  'population spared': ['Which communities survive and where they settle.'],
  'population collapse': ['Blast effects, fallout and the mechanics of the collapse itself.'],
  'agriculture fails': ['Which crops and which soils.'],
  'public works': ['Which projects get built and who pays for them.'],
};

const ALWAYS_SPECULATIVE = [
  'Named individuals. Nobody in the simulation has a name, so no claim is made about any person.',
  'Everyday life, art and belief in any concrete form — the engine carries a churn rate and a novelty rate, and those are not culture.',
  'Anything after AD 2025 is the model running forward with nothing to check it against.',
];

export function expand(
  entry: CatalogueEntry,
  counter: SampleTable,
  base: SampleTable,
  touched: readonly string[],
): Expansion {
  const divergence = entry.year;
  const horizons: Stage[] = [
    {
      title: 'Point of divergence',
      year: divergence,
      summary: entry.lever.reading,
      findings: [
        { label: 'Premise', value: entry.premise, confidence: 'speculative' },
        {
          label: 'Countries it lands on',
          value:
            touched.length === counter.regions.length
              ? 'everywhere'
              : `${touched.length}: ${touched.join(', ')}`,
          confidence: 'high',
        },
        {
          label: 'Everything before this year',
          value: 'identical to the timeline that happened, by construction',
          confidence: 'high',
        },
      ],
    },
  ];

  const marks: [string, number][] = [
    ['Immediate', divergence + 1],
    ['Five years on', divergence + 5],
    ['Twenty-five years on', divergence + 25],
    ['A century on', divergence + 100],
    ['Five centuries on', divergence + 500],
    ['The world in 2026', 2026],
  ];
  for (const [title, year] of marks) {
    if (year <= divergence) continue;
    if (year > yearOf(counter.lastTick)) continue;
    horizons.push(horizon(title, year, counter, base, touched));
  }

  // Second and third-order effects: countries the lever never touched that moved
  // anyway. This is the part the simulation can genuinely answer.
  const endC = counter.ticks.length - 1;
  const endB = base.ticks.length - 1;
  const touchedSet = new Set(touched);
  const movers = counter.regions
    .map((region) => {
      const counterfactual = read(counter, region, KEY.population, endC);
      const baseline = read(base, region, KEY.population, endB);
      const change = baseline === 0 ? 0 : (counterfactual - baseline) / baseline;
      return { region, change, baseline, counterfactual, targeted: touchedSet.has(region) };
    })
    .filter((m) => Math.abs(m.change) > 0.001)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const untouchedMovers = movers.filter((m) => !m.targeted);
  horizons.push({
    title: 'Second and third-order effects',
    year: null,
    summary:
      untouchedMovers.length === 0
        ? 'Nothing outside the countries the divergence landed on moved at all.'
        : `${untouchedMovers.length} countries the divergence never touched ended up somewhere else anyway.`,
    findings: untouchedMovers.slice(0, 8).map((m) => ({
      label: m.region,
      value: `${pct(m.counterfactual, m.baseline)} population by ${formatYear(yearOf(counter.lastTick))}`,
      confidence: 'extrapolation' as const,
    })),
  });

  const speculative = [
    ...(SPECULATIVE_BY_ARCHETYPE[entry.lever.archetype] ?? []),
    ...ALWAYS_SPECULATIVE,
  ];

  return { entry, stages: horizons, movers, speculative };
}

export { LAST_OBSERVED_YEAR };
