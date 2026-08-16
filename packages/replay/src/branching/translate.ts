// Turning "what if Napoleon won Waterloo" into something the kernel can run.
//
// The engine does not model Napoleon, Waterloo, armies, treaties or people. It
// models eighteen structural subsystems. So this does not answer the premise —
// it offers candidate structural readings, shows exactly what each one would
// change, and makes the user pick. Nothing is chosen silently.
//
// The suggestions are keyword matches over the archetype vocabulary. That is a
// deliberately dumb mechanism: a clever one would be a narrative generator
// wearing a simulation's clothes, and the point of showing the lever next to the
// premise is that the reader can see the abstraction and disagree with it.

import {
  agricultureFails,
  conquest,
  conquestFails,
  culturalTurn,
  empireBreaks,
  empireEndures,
  industrialise,
  internalStrife,
  plagueAverted,
  plagueWorse,
  populationCollapse,
  populationSpared,
  publicWorks,
  technologyEarly,
  technologyLost,
  tradeCloses,
  tradeOpens,
  type Lever,
} from '../catalogue/levers.js';
import type { Representability, Support } from '../analysis/evidence.js';

export interface Archetype {
  readonly id: string;
  readonly title: string;
  /** What the structural claim is, in one line of plain language. */
  readonly claim: string;
  readonly lever: () => Lever;
  readonly representability: Representability;
  readonly cues: readonly string[];
}

export const ARCHETYPES: readonly Archetype[] = [
  { id: 'empire-endures', title: 'A state holds together', claim: 'Authority survives, and the roads and canals keep being maintained.', lever: empireEndures, representability: 'structural', cues: ['survives', 'survive', 'endures', 'never fall', 'never collapse', 'holds', 'stabilis', 'stabiliz', 'reform', 'succeed', 'restor', 'eternal', 'millennium'] },
  { id: 'empire-breaks', title: 'A state comes apart', claim: 'Authority collapses and takes its infrastructure with it.', lever: empireBreaks, representability: 'structural', cues: ['falls', 'fell', 'collapse', 'fractur', 'breaks', 'dissol', 'secede', 'independen', 'partition', 'dismantl'] },
  { id: 'conquest', title: 'A conquest succeeds', claim: 'Armies project further for less, and what they take stays taken.', lever: conquest, representability: 'structural', cues: ['conquer', 'wins the war', 'wins world war', 'defeat', 'captur', 'invade', 'victor', 'annex', 'occupies', 'won ', 'wins at', 'takes '] },
  { id: 'conquest-fails', title: 'A conquest fails', claim: 'The campaign breaks and the frontier closes behind it.', lever: conquestFails, representability: 'structural', cues: ['loses', 'lost at', 'is defeated', 'repelled', 'fails to', 'never invade', 'turned back', 'never reaches', 'fails at'] },
  { id: 'plague-averted', title: 'A pandemic does not happen', claim: 'Transmission and lethality cut hard from the divergence year.', lever: plagueAverted, representability: 'partial', cues: ['plague', 'black death', 'pandemic', 'disease', 'epidemic', 'never occur', 'no plague', 'covid', 'smallpox', 'influenza', 'prevented'] },
  { id: 'plague-worse', title: 'A pandemic is far worse', claim: 'Transmission and lethality raised, and the outbreak seeded at the divergence.', lever: plagueWorse, representability: 'partial', cues: ['deadlier', 'worse plague', 'more lethal', 'far more lethal', 'even deadlier', 'pandemic kills'] },
  { id: 'population-spared', title: 'A mortality catastrophe is avoided', claim: 'The dying that emptied this region does not arrive.', lever: populationSpared, representability: 'partial', cues: ['not devastated', 'spared', 'genocide never', 'no famine', 'populations survive', 'never wiped'] },
  { id: 'population-collapse', title: 'A demographic catastrophe', claim: 'Two thirds of the people gone within the divergence year.', lever: populationCollapse, representability: 'partial', cues: ['nuclear', 'catastroph', 'wiped out', 'massacre', 'exterminat', 'apocalyp'] },
  { id: 'technology-early', title: 'Technology arrives early', claim: 'Diffusion and adoption accelerate and the stock steps up.', lever: technologyEarly, representability: 'partial', cues: ['invent', 'discover', 'earlier', 'breakthrough', 'artificial intelligence', 'ai ', 'comput', 'electricity', 'printing press', 'steam', 'fusion', 'nuclear power', 'space', 'mars', 'moon'] },
  { id: 'technology-lost', title: 'Technology never arrives', claim: 'Diffusion and adoption cut, and knowledge forgotten faster.', lever: technologyLost, representability: 'partial', cues: ['never invented', 'never develop', 'never discover', 'delayed', 'no gunpowder', 'never emerges', 'never dominates'] },
  { id: 'trade-opens', title: 'Trade opens', claim: 'Distance stops mattering as much; ports widen and risk falls.', lever: tradeOpens, representability: 'partial', cues: ['trade', 'opens', 'contact', 'colon', 'explor', 'sea route', 'never closes'] },
  { id: 'trade-closes', title: 'Trade closes', claim: 'The roads stop paying for themselves.', lever: tradeCloses, representability: 'partial', cues: ['blockade', 'isolat', 'closes itself', 'embargo', 'sanction', 'never reaches'] },
  { id: 'industrialise', title: 'An industrial takeoff', claim: 'Capital sticks, cities absorb labour and yield responds much harder.', lever: industrialise, representability: 'partial', cues: ['industrial', 'modernis', 'moderniz', 'factory', 'railway', 'economy expands'] },
  { id: 'agriculture-fails', title: 'Agriculture fails', claim: 'Yield cut and soil depleting faster than it recovers.', lever: agricultureFails, representability: 'partial', cues: ['famine', 'crop fail', 'no agriculture', 'soil', 'drought'] },
  { id: 'public-works', title: 'The state builds', claim: 'A fifth of the surplus goes into infrastructure that lasts.', lever: publicWorks, representability: 'partial', cues: ['canal', 'irrigation', 'aqueduct', 'public works', 'infrastructure'] },
  { id: 'cultural-turn', title: 'Belief turns over', claim: 'Selection strength doubled and inherited belief halved.', lever: culturalTurn, representability: 'structural', cues: ['religio', 'reformation', 'christian', 'islam', 'pagan', 'ideolog', 'revolution of ideas', 'contact'] },
  { id: 'internal-strife', title: 'Internal conflict', claim: 'Elites produced faster than positions exist for them.', lever: internalStrife, representability: 'structural', cues: ['civil war', 'rebellion', 'unrest', 'coup', 'insurrection', 'crisis', 'assassinat'] },
];

export function archetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

export interface Suggestion {
  readonly archetype: Archetype;
  /** How many cues matched. Ranking only — not a confidence score. */
  readonly hits: number;
  readonly matched: readonly string[];
}

/**
 * Candidate readings for a premise, best first.
 *
 * Keyword matching, and the interface says so. It exists to save typing, not to
 * decide anything: the user picks, and an empty result is a normal outcome that
 * means "choose one yourself", not a failure.
 */
export function suggest(premise: string): readonly Suggestion[] {
  // Punctuation out, whitespace flattened. Cues are substrings, so a cue is
  // written as the shortest stem that still means what it means ("never occur"
  // catches occurs, occurred and occurring) rather than one exact phrasing.
  const text = premise.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
  return ARCHETYPES.map((archetype) => {
    const matched = archetype.cues.filter((cue) => text.includes(cue));
    return { archetype, hits: matched.length, matched };
  })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

export const SUGGESTION_CAVEAT =
  'These are keyword matches against the archetype vocabulary, not an interpretation of your premise. Genesis does not read history. Pick the structural reading you think is right, or pick none and choose an archetype directly.';

export interface Draft {
  readonly premise: string;
  readonly archetypeId: string;
  readonly year: number;
  readonly regions: readonly string[];
  readonly support: Support;
}

export interface DraftPreview {
  readonly archetype: Archetype;
  readonly reading: string;
  readonly overrides: Readonly<Record<string, string>>;
  readonly shocks: readonly { key: string; factor: number; rationale: string }[];
  /** Always INVENTED: the user chose these numbers, so nothing fitted them. */
  readonly provenance: 'INVENTED';
  readonly limits: readonly string[];
}

/**
 * Exactly what would change, before anything runs. Nothing here executes: this
 * is the "show me first" step.
 */
export function preview(draft: Draft): DraftPreview | undefined {
  const archetype = archetypeById(draft.archetypeId);
  if (archetype === undefined) return undefined;
  const lever = archetype.lever();

  return {
    archetype,
    reading: lever.reading,
    overrides: lever.overrides,
    shocks: lever.shocks.map((s) => ({ key: s.key, factor: s.factor, rationale: s.rationale })),
    provenance: 'INVENTED',
    limits: [
      'Overriding a parameter marks it INVENTED whatever the registry says it was fitted to. A number you chose is invented by definition.',
      'Genesis has no spatial adjacency, so no border moves and no territory changes hands.',
      'Nobody in the simulation has a name. No claim is made about any person.',
      'Population returns toward food-supported carrying capacity within a generation, so mortality-only changes show in the timeline and fade from the endpoint.',
      'Every country starts from the same invented population, so country-specific historical fidelity is not there to be had.',
    ],
  };
}
