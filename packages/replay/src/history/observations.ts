// The historical record, kept deliberately apart from the simulation.
//
// Nothing in this file is a model input and nothing here is hashed. Changing a
// citation, fixing a date or adding an event must never move a terminal state
// hash — history is a layer over the model, not a part of it.
//
// It exists so the interface can ask the question that separates Genesis from an
// alternate-history toy: not only "what does the counterfactual do", but "how
// well does the baseline reproduce what actually happened". A model whose error
// is visible is worth more than one whose error is hidden.
//
// The population series below are world totals in millions, from the standard
// long-run estimates. They are coarse, they disagree with each other by tens of
// percent before 1500, and that uncertainty is carried on every row rather than
// smoothed away.

export interface Source {
  readonly id: string;
  readonly cite: string;
  readonly note: string;
}

export const SOURCES: readonly Source[] = [
  {
    id: 'hyde',
    cite: 'HYDE 3.3 — History Database of the Global Environment, PBL Netherlands',
    note: 'Gridded population and land use, 10000 BC to present. Century resolution before 1700.',
  },
  {
    id: 'mcevedy-jones',
    cite: 'McEvedy & Jones, Atlas of World Population History (1978)',
    note: 'The long-standing reference series. Widely used and widely disputed before 1500.',
  },
  {
    id: 'un-wpp',
    cite: 'UN World Population Prospects 2024',
    note: 'Authoritative from 1950. The projection variants past 2024 disagree by billions.',
  },
];

export interface Observation {
  readonly year: number;
  /** World population, millions. */
  readonly worldPopulationM: number;
  /** Plus or minus, millions. Wide on purpose for early dates. */
  readonly uncertaintyM: number;
  readonly sourceId: string;
}

/**
 * World population, millions. Uncertainty widens going back, because it does.
 * Pre-1500 figures are reconstructions with a factor-of-two spread in the
 * literature and the bands say so.
 */
export const WORLD_POPULATION: readonly Observation[] = [
  { year: -3000, worldPopulationM: 14, uncertaintyM: 7, sourceId: 'mcevedy-jones' },
  { year: -2000, worldPopulationM: 27, uncertaintyM: 13, sourceId: 'mcevedy-jones' },
  { year: -1000, worldPopulationM: 50, uncertaintyM: 20, sourceId: 'mcevedy-jones' },
  { year: -500, worldPopulationM: 100, uncertaintyM: 40, sourceId: 'mcevedy-jones' },
  { year: 1, worldPopulationM: 190, uncertaintyM: 60, sourceId: 'mcevedy-jones' },
  { year: 500, worldPopulationM: 205, uncertaintyM: 60, sourceId: 'mcevedy-jones' },
  { year: 1000, worldPopulationM: 265, uncertaintyM: 70, sourceId: 'mcevedy-jones' },
  { year: 1300, worldPopulationM: 400, uncertaintyM: 80, sourceId: 'mcevedy-jones' },
  { year: 1400, worldPopulationM: 350, uncertaintyM: 70, sourceId: 'mcevedy-jones' },
  { year: 1500, worldPopulationM: 425, uncertaintyM: 60, sourceId: 'hyde' },
  { year: 1700, worldPopulationM: 610, uncertaintyM: 70, sourceId: 'hyde' },
  { year: 1800, worldPopulationM: 900, uncertaintyM: 70, sourceId: 'hyde' },
  { year: 1900, worldPopulationM: 1650, uncertaintyM: 80, sourceId: 'hyde' },
  { year: 1950, worldPopulationM: 2500, uncertaintyM: 40, sourceId: 'un-wpp' },
  { year: 2000, worldPopulationM: 6150, uncertaintyM: 30, sourceId: 'un-wpp' },
  { year: 2024, worldPopulationM: 8160, uncertaintyM: 40, sourceId: 'un-wpp' },
];

export interface HistoricalEvent {
  readonly year: number;
  readonly title: string;
  readonly detail: string;
  readonly regions: readonly string[];
}

/**
 * Anchors, not a chronology. These exist so a reader can orient the timeline,
 * and so the divergence year of a scenario sits next to what was going on.
 * The simulation neither reads nor knows about any of them.
 */
export const HISTORICAL_EVENTS: readonly HistoricalEvent[] = [
  { year: -3000, title: 'Writing in Sumer and Egypt', detail: 'Cuneiform and hieroglyphic records begin.', regions: ['IRQ', 'EGY'] },
  { year: -1200, title: 'Late Bronze Age collapse', detail: 'Palace economies across the eastern Mediterranean fail within a few decades.', regions: ['GRC', 'TUR', 'SYR', 'EGY'] },
  { year: -776, title: 'First recorded Olympiad', detail: 'A conventional anchor for Greek historical chronology.', regions: ['GRC'] },
  { year: -331, title: 'Gaugamela', detail: 'Alexander defeats Darius III; the Achaemenid empire falls.', regions: ['IRQ', 'IRN', 'GRC'] },
  { year: -216, title: 'Cannae', detail: 'Hannibal destroys a Roman army in Italy; Rome does not sue for peace.', regions: ['ITA', 'TUN'] },
  { year: -44, title: 'Assassination of Caesar', detail: 'The Republic does not recover; the Principate follows.', regions: ['ITA'] },
  { year: 476, title: 'Deposition of Romulus Augustulus', detail: 'A conventional marker for the end of the western empire.', regions: ['ITA'] },
  { year: 622, title: 'The Hijra', detail: 'Year one of the Islamic calendar.', regions: ['SAU'] },
  { year: 1066, title: 'Hastings', detail: 'The Norman conquest of England.', regions: ['GBR', 'FRA'] },
  { year: 1206, title: 'Genghis Khan proclaimed', detail: 'The Mongol confederation forms.', regions: ['MNG'] },
  { year: 1347, title: 'Black Death reaches Europe', detail: 'Plague arrives at Messina; roughly a third of Europe dies within five years.', regions: ['ITA', 'FRA', 'GBR', 'DEU', 'ESP'] },
  { year: 1453, title: 'Fall of Constantinople', detail: 'The Ottoman capture ends the eastern Roman empire.', regions: ['TUR', 'GRC'] },
  { year: 1492, title: 'Columbus reaches the Caribbean', detail: 'Sustained contact between the hemispheres begins.', regions: ['ESP', 'MEX', 'USA'] },
  { year: 1519, title: 'Cortés lands in Mexico', detail: 'Epidemic mortality across the Americas follows within a generation.', regions: ['MEX', 'ESP'] },
  { year: 1776, title: 'American Declaration of Independence', detail: 'Thirteen colonies declare separation from Britain.', regions: ['USA', 'GBR'] },
  { year: 1789, title: 'French Revolution', detail: 'The Estates-General becomes the National Assembly.', regions: ['FRA'] },
  { year: 1815, title: 'Waterloo', detail: 'The Napoleonic wars end.', regions: ['FRA', 'GBR', 'DEU'] },
  { year: 1861, title: 'American Civil War begins', detail: 'Secession and four years of war.', regions: ['USA'] },
  { year: 1914, title: 'First World War begins', detail: 'The July crisis becomes a continental war.', regions: ['DEU', 'FRA', 'GBR', 'RUS', 'AUT'] },
  { year: 1918, title: 'Armistice, and influenza', detail: 'The war ends; the 1918 pandemic kills more than the fighting did.', regions: ['DEU', 'FRA', 'GBR', 'USA'] },
  { year: 1939, title: 'Second World War begins', detail: 'Germany invades Poland.', regions: ['DEU', 'POL', 'GBR', 'FRA'] },
  { year: 1945, title: 'Hiroshima and Nagasaki', detail: 'The war ends; nuclear weapons enter the world.', regions: ['JPN', 'USA'] },
  { year: 1962, title: 'Cuban missile crisis', detail: 'Thirteen days at the closest approach to nuclear war.', regions: ['USA', 'RUS', 'CUB'] },
  { year: 1969, title: 'Apollo 11', detail: 'The first crewed lunar landing.', regions: ['USA'] },
  { year: 1991, title: 'Dissolution of the Soviet Union', detail: 'Fifteen successor states.', regions: ['RUS', 'UKR', 'KAZ'] },
  { year: 2020, title: 'COVID-19 pandemic', detail: 'The first pandemic of a globally connected economy.', regions: ['CHN', 'USA', 'ITA', 'IND'] },
];

/** Events within a window of a year, for putting a divergence in context. */
export function eventsNear(year: number, within = 120): readonly HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => Math.abs(e.year - year) <= within).sort(
    (a, b) => a.year - b.year,
  );
}

export function sourceOf(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

/**
 * Model against record.
 *
 * Genesis does not carry real population counts — all 177 countries start from
 * the same invented figure — so comparing its absolute totals to the record
 * would be meaningless. What is comparable is the SHAPE: both series are indexed
 * to their own value at a chosen year, and the question becomes whether the
 * model grows the way the record grows. That is a real question and the answer
 * is currently no, which is worth showing.
 */
export interface FitPoint {
  readonly year: number;
  readonly observedIndex: number;
  readonly observedLowIndex: number;
  readonly observedHighIndex: number;
  readonly baselineIndex: number;
  readonly alternateIndex: number | null;
  readonly sourceId: string;
}

export function modelAgainstRecord(
  baselineByYear: (year: number) => number | undefined,
  alternateByYear: ((year: number) => number | undefined) | undefined,
  indexYear = 1500,
): readonly FitPoint[] {
  const anchor = WORLD_POPULATION.find((o) => o.year === indexYear);
  const baseAnchor = baselineByYear(indexYear);
  if (anchor === undefined || baseAnchor === undefined || baseAnchor === 0) return [];

  const altAnchor = alternateByYear?.(indexYear);

  return WORLD_POPULATION.map((observation) => {
    const base = baselineByYear(observation.year);
    const alt = alternateByYear?.(observation.year);
    return {
      year: observation.year,
      observedIndex: observation.worldPopulationM / anchor.worldPopulationM,
      observedLowIndex:
        (observation.worldPopulationM - observation.uncertaintyM) / anchor.worldPopulationM,
      observedHighIndex:
        (observation.worldPopulationM + observation.uncertaintyM) / anchor.worldPopulationM,
      baselineIndex: base === undefined ? 0 : base / baseAnchor,
      alternateIndex:
        alt === undefined || altAnchor === undefined || altAnchor === 0
          ? null
          : alt / altAnchor,
      sourceId: observation.sourceId,
    };
  }).filter((p) => p.baselineIndex > 0);
}

export const FIT_CAVEAT =
  'Indexed to each series’ own value at the chosen year, because Genesis starts every country from the same invented population and its absolute totals mean nothing. This compares shape, not level. Pre-1500 observations carry a factor-of-two spread in the literature.';
