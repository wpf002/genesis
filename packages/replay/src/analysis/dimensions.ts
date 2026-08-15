// The dimensions every comparison is built from.
//
// One canonical list, used by the sampler, Reality DNA, Reality Distance and the
// first-difference search, so those four can never disagree about what a world
// is made of.
//
// Each dimension names the subsystem behind it, which is what lets the ripple
// map answer "which part of the model moved" without a second source of truth.

export interface Dimension {
  /** Unqualified state key. Prefixed per region at sample time. */
  readonly key: string;
  readonly label: string;
  readonly subsystem: string;
  /**
   * Roughly the largest value this ever takes, used to put every dimension on a
   * comparable scale before they are combined. It is a normalising constant, not
   * a claim about the world: see distance.ts for why it is INVENTED.
   */
  readonly scale: number;
  /** Fractions are already 0..1 and are compared directly. */
  readonly bounded: boolean;
}

export const DIMENSIONS: readonly Dimension[] = [
  { key: 'demography.population', label: 'Population', subsystem: 'demography', scale: 20000, bounded: false },
  { key: 'demography.foodRatio', label: 'Food security', subsystem: 'demography', scale: 2, bounded: true },
  { key: 'agriculture.storage', label: 'Food stored', subsystem: 'agriculture', scale: 40, bounded: false },
  { key: 'agriculture.soilQuality', label: 'Soil', subsystem: 'agriculture', scale: 1, bounded: true },
  { key: 'irrigation.yieldBonus', label: 'Irrigation', subsystem: 'irrigation', scale: 1, bounded: true },
  { key: 'economy.surplus', label: 'Economy', subsystem: 'economy', scale: 400, bounded: false },
  { key: 'trade.volume', label: 'Trade', subsystem: 'trade', scale: 60000, bounded: false },
  { key: 'prices.grain', label: 'Grain price', subsystem: 'prices', scale: 20, bounded: false },
  { key: 'disease_seird.infectious', label: 'Disease burden', subsystem: 'disease', scale: 1, bounded: true },
  { key: 'migration.outflow', label: 'Migration', subsystem: 'migration', scale: 400, bounded: false },
  { key: 'conflict_lanchester.strength', label: 'Military capability', subsystem: 'conflict', scale: 200, bounded: false },
  { key: 'politics_legitimacy.legitimacy', label: 'Legitimacy', subsystem: 'politics', scale: 1, bounded: true },
  { key: 'politics_elites.fragmentation', label: 'Fragmentation', subsystem: 'politics', scale: 1, bounded: true },
  { key: 'culture_transmission.churn', label: 'Cultural churn', subsystem: 'culture', scale: 1, bounded: true },
  { key: 'technology_adoption.adopted', label: 'Technology', subsystem: 'technology', scale: 1, bounded: true },
  { key: 'trade_routes.reach', label: 'Trade reach', subsystem: 'trade routes', scale: 1, bounded: true },
];

export const DIMENSION_KEYS: readonly string[] = DIMENSIONS.map((d) => d.key);

export function dimensionOf(key: string): Dimension | undefined {
  return DIMENSIONS.find((d) => d.key === key);
}

/** Subsystems in the order they run, which is the order effects propagate. */
export const SUBSYSTEMS: readonly string[] = [
  ...new Set(DIMENSIONS.map((d) => d.subsystem)),
];
