'use client';

import { useMemo } from 'react';
import type { Condition } from '@genesis/replay';
import regions from '@/lib/regions.json';

// The map is the thing. Colour is the worst thing happening in a region right
// now, and the circle is how many people are there — so a glance answers "where
// is it bad and how many does it cost", which no line chart does.
//
// Geometry is Natural Earth 110m, six countries, committed as ~60 points a ring.

type Geo = Record<string, { name: string; rings: number[][][] }>;
const GEO = regions as Geo;

const W = 960;
const H = 420;

// Equirectangular, cropped to the band the six regions actually sit in so they
// are not six specks in an ocean of empty projection.
const LON = [-15, 125] as const;
const LAT = [8, 62] as const;
const X = (lon: number) => ((lon - LON[0]) / (LON[1] - LON[0])) * W;
const Y = (lat: number) => ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H;

// Blue / yellow / magenta / green / violet. Distinguishable under deuteranopia,
// which green-amber-red is not.
const STATE_COLOR: Record<Condition['state'], string> = {
  plague: '#d55181',
  famine: '#c98500',
  unrest: '#9085e9',
  thriving: '#199e70',
  steady: '#3987e5',
};

export const STATE_LABEL: Record<Condition['state'], string> = {
  plague: 'Plague',
  famine: 'Famine',
  unrest: 'Unrest',
  thriving: 'Thriving',
  steady: 'Steady',
};

function centroid(rings: number[][][]): [number, number] {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const ring of rings) {
    for (const point of ring) {
      x += point[0] ?? 0;
      y += point[1] ?? 0;
      n += 1;
    }
  }
  return n === 0 ? [0, 0] : [x / n, y / n];
}

export function WorldView({
  title,
  subtitle,
  conditions,
  populationScale,
  dimmed = false,
}: {
  title: string;
  subtitle: string;
  conditions: readonly Condition[];
  /** Shared across both maps, or the two timelines cannot be compared by eye. */
  populationScale: number;
  dimmed?: boolean;
}) {
  const shapes = useMemo(
    () =>
      conditions.map((condition) => {
        const geo = GEO[condition.region];
        const [lon, lat] = geo === undefined ? [0, 0] : centroid(geo.rings);
        return { condition, geo, cx: X(lon), cy: Y(lat) };
      }),
    [conditions],
  );

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs tracking-[0.08em] text-ink">{title}</span>
        <span className="font-mono text-[11px] text-ink-muted">{subtitle}</span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded border border-rule bg-surface"
        role="img"
        aria-label={`${title}: six regions coloured by what is happening in each`}
        style={{ opacity: dimmed ? 0.75 : 1 }}
      >
        <defs>
          <pattern
            id="worldhatch"
            width="8"
            height="8"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d55181" strokeOpacity="0.3" strokeWidth="3" />
          </pattern>
        </defs>
        {/* Sandbox watermark, on the map itself so a screenshot carries it. */}
        <rect width={W} height={H} fill="url(#worldhatch)" opacity="0.07" />

        {shapes.map(({ condition, geo }) =>
          geo === undefined ? null : (
            <g key={condition.region}>
              {geo.rings.map((ring, i) => (
                <path
                  key={i}
                  d={`M${ring
                    .map((pt) => `${X(pt[0] ?? 0).toFixed(1)},${Y(pt[1] ?? 0).toFixed(1)}`)
                    .join('L')}Z`}
                  fill={STATE_COLOR[condition.state]}
                  fillOpacity={condition.state === 'steady' ? 0.22 : 0.5}
                  stroke={STATE_COLOR[condition.state]}
                  strokeOpacity={0.9}
                  strokeWidth={0.75}
                />
              ))}
            </g>
          ),
        )}

        {/* People, as area. sqrt so the circle reads as a count, not a radius. */}
        {shapes.map(({ condition, cx, cy }) => {
          const r = 4 + Math.sqrt(Math.max(condition.population, 0) / populationScale) * 46;
          return (
            <g key={`pop-${condition.region}`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={STATE_COLOR[condition.state]}
                fillOpacity={0.28}
                stroke={STATE_COLOR[condition.state]}
                strokeWidth={1.25}
              />
              <text
                x={cx}
                y={cy - r - 5}
                textAnchor="middle"
                fill="var(--ink-secondary)"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              >
                {GEO[condition.region]?.name ?? condition.region}
              </text>
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(condition.population).toLocaleString('en-US')}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function ConditionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {(Object.keys(STATE_LABEL) as Condition['state'][]).map((state) => (
        <span key={state} className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: STATE_COLOR[state] }}
          />
          {STATE_LABEL[state]}
        </span>
      ))}
      <span className="font-mono text-[11px] text-ink-muted">circle = people</span>
    </div>
  );
}
