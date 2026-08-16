'use client';

import { useMemo } from 'react';
import { DIMENSIONS, type Condition } from '@genesis/replay';
import regions from '@/lib/regions.json';

// Alternate minus baseline, per country, for one dimension.
//
// A diverging scale, so the question "which way did it go" is answered by hue
// and "by how much" by saturation. Blue up, magenta down, and neither of those
// is green or red — the palette has to survive deuteranopia like the rest.
//
// This colours state, never territory. Genesis has no spatial adjacency and no
// border ever moves; a country is dark here because a number inside it differs.

type Geo = Record<string, { name: string; rings: number[][][] }>;
const GEO = regions as Geo;

const W = 960;
const H = 460;
const LON = [-170, 180] as const;
const LAT = [-56, 78] as const;
const X = (lon: number) => ((lon - LON[0]) / (LON[1] - LON[0])) * W;
const Y = (lat: number) => ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H;

const PATHS: Record<string, string> = Object.fromEntries(
  Object.entries(GEO).map(([code, geo]) => [
    code,
    geo.rings
      .map(
        (ring) =>
          `M${ring.map((pt) => `${X(pt[0] ?? 0).toFixed(1)},${Y(pt[1] ?? 0).toFixed(1)}`).join('L')}Z`,
      )
      .join(''),
  ]),
);

export const DIFF_FIELDS = [
  { key: 'population', label: 'Population', of: (c: Condition) => c.population },
  { key: 'foodRatio', label: 'Food per head', of: (c: Condition) => c.foodRatio },
  { key: 'infectious', label: 'Disease burden', of: (c: Condition) => c.infectious },
  { key: 'legitimacy', label: 'Legitimacy', of: (c: Condition) => c.legitimacy },
] as const;

export type DiffField = (typeof DIFF_FIELDS)[number]['key'];

export function DiffMap({
  alternate,
  baseline,
  field,
  onField,
  onSelect,
}: {
  alternate: readonly Condition[];
  baseline: readonly Condition[];
  field: DiffField;
  onField: (field: DiffField) => void;
  onSelect?: (region: string) => void;
}) {
  const chosen = DIFF_FIELDS.find((f) => f.key === field) ?? DIFF_FIELDS[0];

  const deltas = useMemo(() => {
    const base = new Map(baseline.map((c) => [c.region, c]));
    const out = new Map<string, number>();
    let peak = 0;
    for (const condition of alternate) {
      const other = base.get(condition.region);
      if (other === undefined) continue;
      const a = chosen.of(condition);
      const b = chosen.of(other);
      // Relative where there is something to be relative to, absolute otherwise.
      const delta = b === 0 ? a - b : (a - b) / Math.abs(b);
      out.set(condition.region, delta);
      if (Math.abs(delta) > peak) peak = Math.abs(delta);
    }
    return { out, peak: Math.max(peak, 1e-6) };
  }, [alternate, baseline, chosen]);

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          Diff map <span className="ml-2 text-ink-muted">alternate − baseline</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {DIFF_FIELDS.map((f) => (
            <button
              key={f.key}
              onClick={() => onField(f.key)}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                f.key === field
                  ? 'border-ink text-ink'
                  : 'border-rule text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-rule bg-surface" role="img">
        <defs>
          <pattern id="diffhatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d55181" strokeOpacity="0.3" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#diffhatch)" opacity="0.06" />

        {Object.keys(PATHS).map((code) => {
          const delta = deltas.out.get(code);
          const strength = delta === undefined ? 0 : Math.min(1, Math.abs(delta) / deltas.peak);
          const colour =
            delta === undefined || delta === 0
              ? 'var(--grid)'
              : delta > 0
                ? '#3987e5'
                : '#d55181';
          return (
            <path
              key={code}
              d={PATHS[code] as string}
              fill={colour}
              fillOpacity={delta === undefined ? 0.35 : 0.15 + strength * 0.75}
              stroke="var(--plane)"
              strokeWidth={0.4}
              style={{ cursor: onSelect !== undefined && delta !== undefined ? 'pointer' : 'default' }}
              onClick={() => {
                if (onSelect !== undefined && delta !== undefined) onSelect(code);
              }}
            >
              <title>
                {delta === undefined
                  ? `${GEO[code]?.name ?? code} — not simulated in this run`
                  : `${GEO[code]?.name ?? code} — ${chosen.label} ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
              </title>
            </path>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#d55181' }} />
          lower than baseline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--grid)' }} />
          no difference
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#3987e5' }} />
          higher than baseline
        </span>
        <span>scaled to the largest difference on screen ({(deltas.peak * 100).toFixed(1)}%)</span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
        Shading is state, not territory. No border moves in Genesis.
      </p>
    </figure>
  );
}

export { DIMENSIONS };
