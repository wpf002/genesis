'use client';

import { useMemo } from 'react';
import type { Condition } from '@genesis/replay';
import regions from '@/lib/regions.json';

// Every country in Natural Earth 110m, coloured by what is happening there right
// now. At 177 countries there is no room for a label on each one, so the colour
// carries the state and the reader gets a list of the biggest movers beside it.

type Geo = Record<string, { name: string; continent: string; at: number[]; rings: number[][][] }>;
const GEO = regions as Geo;

const W = 960;
const H = 460;

// Equirectangular, trimmed of the empty polar bands so the inhabited world is
// not a strip through the middle.
const LON = [-170, 180] as const;
const LAT = [-56, 78] as const;
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

export function countryName(code: string): string {
  return GEO[code]?.name ?? code;
}

/** Paths never change, so they are built once and reused across every frame. */
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

export function WorldView({
  title,
  subtitle,
  conditions,
  forecast = false,
  onSelect,
}: {
  title: string;
  subtitle: string;
  conditions: readonly Condition[];
  /** Past the last year anybody could check. Drawn differently, deliberately. */
  forecast?: boolean;
  /** Optional: clicking a country opens its state panel. */
  onSelect?: (region: string) => void;
}) {
  const byCode = useMemo(
    () => new Map(conditions.map((condition) => [condition.region, condition])),
    [conditions],
  );

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink">{title}</span>
        <span className="font-mono text-[11px] text-ink-muted">{subtitle}</span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded border bg-surface"
        role="img"
        aria-label={`${title}: every country coloured by what is happening there`}
        style={{ borderColor: forecast ? '#9085e9' : 'var(--rule)' }}
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
          <pattern
            id="forecasthatch"
            width="10"
            height="10"
            patternTransform="rotate(-45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#9085e9" strokeOpacity="0.5" strokeWidth="2" />
          </pattern>
        </defs>
        {/* Sandbox watermark, on the map itself so a screenshot carries it. */}
        <rect width={W} height={H} fill="url(#worldhatch)" opacity="0.06" />

        {Object.keys(PATHS).map((code) => {
          const condition = byCode.get(code);
          // A country the run did not simulate is drawn as land, not as data.
          const color = condition === undefined ? 'var(--grid)' : STATE_COLOR[condition.state];
          const opacity =
            condition === undefined ? 0.5 : condition.state === 'steady' ? 0.34 : 0.78;
          return (
            <path
              key={code}
              d={PATHS[code] as string}
              fill={color}
              fillOpacity={opacity}
              stroke="var(--plane)"
              strokeWidth={0.4}
              style={{
                cursor: onSelect !== undefined && condition !== undefined ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (onSelect !== undefined && condition !== undefined) onSelect(code);
              }}
            >
              <title>
                {condition === undefined
                  ? countryName(code)
                  : `${countryName(code)} — ${STATE_LABEL[condition.state]}, ${Math.round(condition.population).toLocaleString('en-US')} people`}
              </title>
            </path>
          );
        })}

        {forecast && <rect width={W} height={H} fill="url(#forecasthatch)" opacity="0.16" />}
      </svg>
    </figure>
  );
}

export function ConditionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {(Object.keys(STATE_LABEL) as Condition['state'][]).map((state) => (
        <span
          key={state}
          className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: STATE_COLOR[state] }}
          />
          {STATE_LABEL[state]}
        </span>
      ))}
    </div>
  );
}
