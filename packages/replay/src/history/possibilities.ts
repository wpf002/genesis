// The possibility tree, and the people layer.
//
// Both of these live outside the simulation on purpose. A possibility is a way
// history could have gone that a person thought of; a person is a person. The
// engine has no opinion about either, and the whole value of putting them here
// is that they are visibly not simulation output.
//
// What the engine CAN say about a possibility is whether it could express it,
// and that is the `support` field. Where it can, "simulate approximation" turns
// the possibility into an explicit archetype and year — and shows the parameter
// changes before running, like every other authored divergence.

import type { Representability } from '../analysis/evidence.js';

export interface Possibility {
  readonly id: string;
  readonly scenarioId: string;
  readonly title: string;
  readonly detail: string;
  readonly support: Representability;
  /** Set when the engine can approximate it: the archetype and year to run. */
  readonly approximation?: {
    readonly archetypeId: string;
    readonly year: number;
    readonly regions: readonly string[];
    readonly caveat: string;
  };
}

/**
 * Branches a reader might reasonably imagine from a divergence, and what
 * Genesis can do with each. Attached to scenarios where the alternatives are
 * genuinely contested rather than to all 180.
 */
export const POSSIBILITIES: readonly Possibility[] = [
  // The Cuban missile crisis, the spec's own worked example.
  { id: 'cuba-limited', scenarioId: 'the-cuban-missile-crisis-goes-nuclear', title: 'Limited nuclear exchange', detail: 'A handful of weapons used, then a halt. Casualties in the millions rather than the hundreds of millions.', support: 'partial', approximation: { archetypeId: 'population-collapse', year: 1962, regions: ['USA', 'RUS', 'MEX'], caveat: 'Runs as a mortality shock with raised baseline mortality. The engine has no blast, no fallout and no radius — only people who stop existing.' } },
  { id: 'cuba-nato', scenarioId: 'the-cuban-missile-crisis-goes-nuclear', title: 'NATO and Warsaw Pact escalation', detail: 'Conventional war across central Europe follows the first use.', support: 'structural', approximation: { archetypeId: 'conquest', year: 1962, regions: ['DEU', 'POL', 'RUS', 'FRA', 'GBR'], caveat: 'Runs as raised conflict capability and reach. There are no fronts, no units and no territory to take.' } },
  { id: 'cuba-strategic', scenarioId: 'the-cuban-missile-crisis-goes-nuclear', title: 'Full strategic exchange', detail: 'Counter-value strikes on both sides; industrial civilization in the northern hemisphere ends.', support: 'not-modelled' },
  { id: 'cuba-deescalate', scenarioId: 'the-cuban-missile-crisis-goes-nuclear', title: 'De-escalation after first use', detail: 'Both leaderships stop, and the taboo is established by demonstration rather than by restraint.', support: 'not-modelled' },

  { id: 'wwi-trade', scenarioId: 'germany-wins-world-war-i', title: 'A German-run continental trade system', detail: 'Mitteleuropa as a customs union rather than an occupation.', support: 'partial', approximation: { archetypeId: 'trade-opens', year: 1918, regions: ['DEU', 'FRA', 'POL', 'AUT', 'HUN', 'NLD', 'BEL'], caveat: 'Runs as lower route risk and a wider port cap. No tariffs, no treaties, no institutions.' } },
  { id: 'wwi-french-collapse', scenarioId: 'germany-wins-world-war-i', title: 'French industrial capacity collapses', detail: 'Reparations and occupation of the north strip French industry for a generation.', support: 'partial', approximation: { archetypeId: 'empire-breaks', year: 1918, regions: ['FRA'], caveat: 'Runs as lost legitimacy and abandoned infrastructure in France alone.' } },
  { id: 'wwi-durable', scenarioId: 'germany-wins-world-war-i', title: 'A durable German industrial lead', detail: 'Victory compounds into a technological and industrial advantage that holds.', support: 'partial', approximation: { archetypeId: 'industrialise', year: 1918, regions: ['DEU'], caveat: 'Runs as faster diffusion, stickier capital and a higher urban share.' } },
  { id: 'wwi-instability', scenarioId: 'germany-wins-world-war-i', title: 'Victory produces its own instability', detail: 'An enlarged empire with more subject populations than it can govern.', support: 'structural', approximation: { archetypeId: 'internal-strife', year: 1925, regions: ['DEU', 'POL', 'AUT'], caveat: 'Runs as elite overproduction against a lowered threshold. No factions, no parties, no names.' } },

  { id: 'rome-continuous', scenarioId: 'rome-eternal', title: 'Continuous institutional evolution', detail: 'The empire reforms rather than freezing, and reaches the modern era as a state.', support: 'structural', approximation: { archetypeId: 'empire-endures', year: 400, regions: ['ITA', 'FRA', 'ESP', 'TUR', 'EGY', 'TUN'], caveat: 'Runs as durable legitimacy and maintained infrastructure. The engine has no institutions to evolve.' } },
  { id: 'rome-early-industry', scenarioId: 'rome-eternal', title: 'An earlier industrial revolution', detail: 'Continuity of engineering knowledge brings mechanisation forward by a millennium.', support: 'partial', approximation: { archetypeId: 'industrialise', year: 700, regions: ['ITA', 'FRA', 'ESP', 'TUR'], caveat: 'Runs as an industrial takeoff. Which inventions, in what order, is not represented.' } },
  { id: 'rome-no-successors', scenarioId: 'rome-eternal', title: 'No successor states, so no nation-states', detail: 'The European state system never forms, and neither does the competition historians credit for a great deal.', support: 'not-modelled' },

  { id: 'plague-wages', scenarioId: 'the-black-death-never-occurs', title: 'Labour stays cheap, so serfdom persists', detail: 'Without a labour shortage, the bargaining position that ended serfdom in the west never appears.', support: 'not-modelled' },
  { id: 'plague-crowded', scenarioId: 'the-black-death-never-occurs', title: 'A more crowded, hungrier Europe', detail: 'Population presses harder on a fixed food supply.', support: 'full', approximation: { archetypeId: 'plague-averted', year: 1347, regions: ['ITA', 'FRA', 'DEU', 'GBR', 'ESP'], caveat: 'This one the engine represents directly: mortality falls, population presses on carrying capacity, food per head falls.' } },
];

export function possibilitiesFor(scenarioId: string): readonly Possibility[] {
  return POSSIBILITIES.filter((p) => p.scenarioId === scenarioId);
}

export const POSSIBILITY_CAVEAT =
  'These are ways a person might read the divergence, not outputs. Where Genesis can approximate one, the approximation is an explicit archetype and year and shows its parameter changes before it runs — and it is still an approximation of the reading, not of the history.';

// ---------------------------------------------------------------------------

export type Continuity = 'high' | 'moderate' | 'low' | 'indeterminate';

export interface Person {
  readonly name: string;
  readonly lived: string;
  readonly known: string;
  readonly scenarioIds: readonly string[];
  /** A reading, not an output. Always interpretive. */
  readonly alternate: string;
}

/**
 * People, as a clearly separate layer.
 *
 * Genesis models no individuals. Nobody in the simulation has a name, an age or
 * a birth. Everything in `alternate` is a person reasoning, and the interface
 * labels it INTERPRETIVE without exception.
 */
export const PEOPLE: readonly Person[] = [
  { name: 'Julius Caesar', lived: '100–44 BC', known: 'Dictator of Rome; his assassination ended the Republic in practice.', scenarioIds: ['julius-caesar-survives-the-ides-of-march', 'the-roman-republic-survives'], alternate: 'A longer dictatorship would have institutionalised one-man rule under a man who had to justify it, rather than under an heir who did not.' },
  { name: 'Hannibal Barca', lived: '247–183 BC', known: 'Carthaginian general; destroyed Roman armies in Italy without taking Rome.', scenarioIds: ['hannibal-captures-rome', 'carthage-wins-the-second-punic-war'], alternate: 'Taking the city required a siege train and allies he never had; the counterfactual usually smuggles both in.' },
  { name: 'Genghis Khan', lived: 'c. 1162–1227', known: 'Founded the Mongol empire, the largest contiguous land empire in history.', scenarioIds: ['genghis-khan-lives-another-20-years', 'the-mongols-conquer-western-europe'], alternate: 'Mongol campaigns halted on succession crises more than on defeats, so a longer life is one of the few person-level changes with a clear structural reading.' },
  { name: 'Napoleon Bonaparte', lived: '1769–1821', known: 'Emperor of the French; his defeat at Waterloo ended twenty-three years of war.', scenarioIds: [], alternate: 'Waterloo was late in a losing coalition war. Winning the battle and winning the war are different counterfactuals and are often conflated.' },
  { name: 'Abraham Lincoln', lived: '1809–1865', known: 'US president through the Civil War; assassinated days after Confederate surrender.', scenarioIds: ['lincoln-survives-the-assassination', 'reconstruction-succeeds'], alternate: 'Survival is usually read as a gentler Reconstruction, which is contested: his stated positions hardened through the war.' },
  { name: 'Alan Turing', lived: '1912–1954', known: 'Founded computer science; broke naval Enigma; died at 41.', scenarioIds: ['alan-turing-lives-into-old-age'], alternate: 'Another thirty years of one person is a small input to a field that grew by orders of magnitude, which is an argument against the great-man reading rather than for it.' },
];

export function peopleFor(scenarioId: string): readonly Person[] {
  return PEOPLE.filter((p) => p.scenarioIds.includes(scenarioId));
}

/**
 * How defensible it is to assume the same individuals are still born.
 *
 * Derived from how far the demographic path has moved, because that is the
 * thing that actually governs it: once populations differ, the specific people
 * born differ, and after enough divergence the question stops being answerable.
 * Qualitative on purpose — there is no probability here.
 */
export function continuity(populationDelta: number, yearsSince: number): Continuity {
  const drift = Math.abs(populationDelta);
  if (yearsSince < 30 && drift < 0.02) return 'high';
  if (yearsSince < 90 && drift < 0.08) return 'moderate';
  if (drift < 0.2) return 'low';
  return 'indeterminate';
}

export const CONTINUITY_NOTE: Record<Continuity, string> = {
  high: 'Within a generation of the divergence and with populations barely moved, the same people are broadly still being born.',
  moderate: 'A few generations on. Individuals who mattered later may not exist in the same form.',
  low: 'Populations have moved enough that assuming the same births is hard to defend.',
  indeterminate:
    'Far enough past the divergence that naming any individual is indefensible. Nobody in this world is anybody from ours.',
};
