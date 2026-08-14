'use client';

import { useMemo, useState } from 'react';
import { Fx, Run } from '@genesis/kernel';
import { REGIONS, worldModules } from '@genesis/models';
import { ModeBadge } from '@/components/ModeBadge';
import regions from '@/lib/regions.json';

// Geometry is Natural Earth 110m, six countries, simplified to ~60 points per
// ring and committed. The state behind it is the kernel running here: 18
// subsystems per region, each with its own substream.

const TICKS = 300;
const FIELDS = [
  'demography.population',
  'demography.foodRatio',
  'disease_seird.infectious',
  'technology_adoption.adopted',
  'politics_legitimacy.legitimacy',
] as const;

type Geo = Record<string, { name: string; rings: number[][][] }>;
const GEO = regions as Geo;

// Equirectangular. Good enough for a toy and honest about being a projection.
const X = (lon: number) => (lon + 180) * (960 / 360);
const Y = (lat: number) => (90 - lat) * (480 / 180);

export default function MapView() {
  const [tick, setTick] = useState(TICKS);
  const [field, setField] = useState<string>(FIELDS[0]);
  const [hovered, setHovered] = useState<string | null>(null);

  const history = useMemo(() => {
    const run = new Run({ seed: 20260806n, modules: worldModules() });
    const frames: Record<string, number>[] = [];
    for (let t = 1; t <= TICKS; t++) {
      run.step();
      const frame: Record<string, number> = {};
      for (const region of REGIONS) {
        for (const f of FIELDS) {
          frame[`${region}:${f}`] = Number(Fx.toString(run.get(`${region}:${f}`)));
        }
      }
      frames.push(frame);
    }
    return { frames, hash: run.stateHash() };
  }, []);

  const frame = history.frames[tick - 1] ?? {};
  const values = REGIONS.map((r) => frame[`${r}:${field}`] ?? 0);
  const max = Math.max(...values, 1e-9);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1e-9);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Map</h1>
          <p className="mt-2 text-sm text-ink-secondary">Six regions. 18 subsystems each.</p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {FIELDS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setField(f)}
            className={`rounded border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.08em] transition-colors ${
              f === field
                ? 'border-[var(--prov-calibrated)] text-ink'
                : 'border-rule text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 960 480"
        className="mt-6 w-full rounded border border-rule bg-surface"
        role="img"
        aria-label="Six simulated regions shaded by the selected state value"
      >
        <defs>
          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--prov-invented)" strokeOpacity="0.35" strokeWidth="3" />
          </pattern>
        </defs>
        {/* Sandbox watermark, on the map itself so a screenshot carries it. */}
        <rect width="960" height="480" fill="url(#hatch)" opacity="0.12" />

        {REGIONS.map((code) => {
          const geo = GEO[code];
          if (geo === undefined) return null;
          const value = frame[`${code}:${field}`] ?? 0;
          const t = (value - min) / span;
          return (
            <g
              key={code}
              onMouseEnter={() => setHovered(code)}
              onMouseLeave={() => setHovered(null)}
            >
              {geo.rings.map((ring, i) => (
                <path
                  key={i}
                  d={`M${ring.map((pt) => `${X(pt[0] ?? 0).toFixed(1)},${Y(pt[1] ?? 0).toFixed(1)}`).join('L')}Z`}
                  fill="var(--prov-calibrated)"
                  fillOpacity={0.15 + t * 0.75}
                  stroke={hovered === code ? 'var(--ink)' : 'var(--rule)'}
                  strokeWidth={hovered === code ? 1.5 : 0.75}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="label" htmlFor="tick">
          Tick
        </label>
        <input
          id="tick"
          type="range"
          min={1}
          max={TICKS}
          value={tick}
          onChange={(e) => setTick(Number(e.target.value))}
          className="h-1 flex-1 min-w-48 cursor-pointer appearance-none rounded bg-rule accent-[var(--prov-calibrated)]"
        />
        <span className="font-mono text-sm tabular-nums text-ink">{tick}</span>
      </div>

      <ul className="mt-6 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-3">
        {REGIONS.map((code) => (
          <li key={code} className="flex items-baseline justify-between gap-3 bg-surface px-4 py-3">
            <span className="font-mono text-xs text-ink-secondary">
              {GEO[code]?.name ?? code}
            </span>
            <span className="font-mono text-xs tabular-nums text-ink">
              {(frame[`${code}:${field}`] ?? 0).toFixed(4)}
            </span>
          </li>
        ))}
      </ul>

      <p className="label mt-6 break-all">terminal state hash {history.hash}</p>
      <p className="label mt-2">Genesis does not claim Sandbox output means anything.</p>
    </main>
  );
}
