// Where two worlds first stop agreeing, and how the difference spreads.
//
// Genesis has an unusually strong claim to make here. Pre-divergence state is
// byte-identical and the RNG substreams are stable across the branch, so the
// first disagreement is caused by the intervention rather than by drift. That is
// not true of most simulators and it is worth showing.

import { yearOf } from '../chronicle.js';
import type { SampleTable } from '../world.js';
import { DIMENSIONS, dimensionOf } from './dimensions.js';
import type { DistancePoint } from './distance.js';

export interface FirstDifference {
  readonly tick: number;
  readonly year: number;
  readonly region: string;
  readonly key: string;
  readonly label: string;
  readonly subsystem: string;
  readonly baseline: number;
  readonly alternate: number;
}

const at = (t: SampleTable, region: string, key: string, i: number): number =>
  t.values.get(`${region}:${key}`)?.[i] ?? 0;

/**
 * The first sampled year at which any dimension in any region disagrees.
 * Scanning is by tick first so the answer is the earliest moment, not the
 * earliest key.
 */
export function firstDifference(
  alternate: SampleTable,
  baseline: SampleTable,
): FirstDifference | undefined {
  const n = Math.min(alternate.ticks.length, baseline.ticks.length);
  for (let i = 0; i < n; i += 1) {
    for (const region of alternate.regions) {
      for (const d of DIMENSIONS) {
        const a = at(alternate, region, d.key, i);
        const b = at(baseline, region, d.key, i);
        if (a !== b) {
          const tick = alternate.ticks[i] as number;
          return {
            tick,
            year: yearOf(tick),
            region,
            key: d.key,
            label: d.label,
            subsystem: d.subsystem,
            baseline: b,
            alternate: a,
          };
        }
      }
    }
  }
  return undefined;
}

export interface RegionArrival {
  readonly region: string;
  readonly tick: number;
  readonly year: number;
  /** True when the intervention was applied here rather than reaching here. */
  readonly targeted: boolean;
}

/**
 * When the difference reached each region. A region that was never targeted and
 * still shows up is the knock-on story, and this is where it comes from.
 */
export function spread(
  alternate: SampleTable,
  baseline: SampleTable,
  touched: readonly string[],
): readonly RegionArrival[] {
  const targetedSet = new Set(touched);
  const n = Math.min(alternate.ticks.length, baseline.ticks.length);
  const out: RegionArrival[] = [];

  for (const region of alternate.regions) {
    for (let i = 0; i < n; i += 1) {
      let differs = false;
      for (const d of DIMENSIONS) {
        if (at(alternate, region, d.key, i) !== at(baseline, region, d.key, i)) {
          differs = true;
          break;
        }
      }
      if (differs) {
        const tick = alternate.ticks[i] as number;
        out.push({ region, tick, year: yearOf(tick), targeted: targetedSet.has(region) });
        break;
      }
    }
  }
  return out.sort((a, b) => a.tick - b.tick);
}

export type CascadeKind = 'model-detected';

export interface CascadeEvent {
  readonly tick: number;
  readonly year: number;
  readonly kind: CascadeKind;
  /** How fast Reality Distance was moving here, relative to its own typical rate. */
  readonly acceleration: number;
  readonly distance: number;
  /** The subsystems doing the moving, largest first. */
  readonly drivers: readonly string[];
}

/**
 * Points where divergence accelerates sharply. Detected from the Reality
 * Distance series rather than from a list of famous years: a cascade here means
 * the model moved, and nothing else.
 *
 * The threshold is a multiple of the run's own median rate of change, so a
 * quiet scenario does not get its noise promoted to cascades.
 */
export function cascades(
  series: readonly DistancePoint[],
  sensitivity = 6,
): readonly CascadeEvent[] {
  if (series.length < 3) return [];

  const rates: number[] = [];
  for (let i = 1; i < series.length; i += 1) {
    rates.push(Math.abs((series[i] as DistancePoint).distance - (series[i - 1] as DistancePoint).distance));
  }
  const sorted = [...rates].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  // A run with no movement at all has no cascades, rather than all of them.
  if (median <= 0) return [];

  const threshold = median * sensitivity;
  const out: CascadeEvent[] = [];
  let mutedUntil = -1;

  for (let i = 1; i < series.length; i += 1) {
    const point = series[i] as DistancePoint;
    const rate = rates[i - 1] as number;
    if (rate < threshold || point.tick <= mutedUntil) continue;

    const drivers = Object.entries(point.bySubsystem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    out.push({
      tick: point.tick,
      year: point.year,
      kind: 'model-detected',
      acceleration: rate / median,
      distance: point.distance,
      drivers,
    });
    mutedUntil = point.tick + 40;
  }
  return out;
}

export interface Convergence {
  readonly converging: boolean;
  readonly peakYear: number;
  readonly peakDistance: number;
  readonly finalDistance: number;
  /** How much of the peak difference has been given back by the end. */
  readonly recovered: number;
}

/**
 * Whether the two worlds are drifting back together. Real, and worth showing:
 * the demographic system is Malthusian, so mortality-driven branches routinely
 * peak and then converge, and a reader who only sees the endpoint would think
 * nothing ever happened.
 */
export function convergence(series: readonly DistancePoint[]): Convergence | undefined {
  if (series.length === 0) return undefined;
  let peak = series[0] as DistancePoint;
  for (const point of series) if (point.distance > peak.distance) peak = point;
  const final = series[series.length - 1] as DistancePoint;

  const recovered = peak.distance === 0 ? 0 : 1 - final.distance / peak.distance;
  return {
    converging: recovered > 0.2 && peak.tick < final.tick,
    peakYear: peak.year,
    peakDistance: peak.distance,
    finalDistance: final.distance,
    recovered,
  };
}

export interface RippleRing {
  readonly ring: number;
  readonly title: string;
  readonly entries: readonly { label: string; detail: string }[];
}

export type RippleFidelity = 'full causal trace' | 'aggregated difference trace';

export interface Ripple {
  readonly fidelity: RippleFidelity;
  readonly rings: readonly RippleRing[];
}

/**
 * Propagation outward from the divergence.
 *
 * When the factor ledger is available this could be a true causal trace. At
 * world scale it is not — the ledger is disabled to fit in a browser — so this
 * builds the coarser version from state deltas and says which one it is rather
 * than letting the reader assume the stronger one.
 */
export function ripple(
  alternate: SampleTable,
  baseline: SampleTable,
  touched: readonly string[],
  changedParams: readonly string[],
  hasLedger: boolean,
): Ripple {
  const arrivals = spread(alternate, baseline, touched);
  const last = Math.min(alternate.ticks.length, baseline.ticks.length) - 1;

  // Which dimensions moved, ranked by how far.
  const moved = DIMENSIONS.map((d) => {
    let total = 0;
    for (const region of alternate.regions) {
      const a = at(alternate, region, d.key, last);
      const b = at(baseline, region, d.key, last);
      total += Math.abs(a - b) / (d.bounded ? 1 : d.scale);
    }
    return { d, total };
  })
    .filter((m) => m.total > 1e-9)
    .sort((a, b) => b.total - a.total);

  const targeted = arrivals.filter((a) => a.targeted);
  const knockOn = arrivals.filter((a) => !a.targeted);
  const directSubsystems = new Set(
    changedParams.map((p) => p.split('.')[0] ?? '').filter((s) => s !== ''),
  );

  return {
    fidelity: hasLedger ? 'full causal trace' : 'aggregated difference trace',
    rings: [
      {
        ring: 1,
        title: 'What was changed',
        entries: changedParams.map((param) => ({
          label: param,
          detail: 'parameter override — INVENTED by definition',
        })),
      },
      {
        ring: 2,
        title: 'Where it was applied',
        entries: targeted.slice(0, 10).map((a) => ({
          label: a.region,
          detail: `diverged ${a.year < 0 ? `${-a.year} BC` : `AD ${a.year}`}`,
        })),
      },
      {
        ring: 3,
        title: 'Subsystems that moved',
        entries: moved
          .filter((m) => directSubsystems.has(m.d.subsystem))
          .slice(0, 8)
          .map((m) => ({ label: m.d.label, detail: m.d.subsystem })),
      },
      {
        ring: 4,
        title: 'Subsystems it spread into',
        entries: moved
          .filter((m) => !directSubsystems.has(m.d.subsystem))
          .slice(0, 8)
          .map((m) => ({ label: m.d.label, detail: `${m.d.subsystem} — never targeted` })),
      },
      {
        ring: 5,
        title: 'Countries it reached',
        entries: knockOn.slice(0, 12).map((a) => ({
          label: a.region,
          detail: `reached ${a.year < 0 ? `${-a.year} BC` : `AD ${a.year}`}`,
        })),
      },
    ],
  };
}

export { dimensionOf };
