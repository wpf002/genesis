'use client';

import { useMemo } from 'react';
import type { Sample, Series } from '@genesis/replay';

// Two techniques, both borrowed rather than invented: Tufte small multiples for
// twenty subsystems at once, and a counterfactual overlay - the scenario drawn
// over its own untouched baseline - so the question the packs exist to answer
// ("what did this change?") is the thing you actually see.
//
// Hand-rolled SVG. The site has no charting dependency and does not need one.

export interface ChartPair {
  readonly stateKey: string;
  readonly scenario: Series;
  readonly baseline: Series;
}

interface Scale {
  readonly x: (tick: number) => number;
  readonly y: (value: number) => number;
  readonly lastTick: number;
}

function scaleFor(pair: ChartPair, width: number, height: number, pad: number): Scale {
  const ticks = [...pair.scenario.samples, ...pair.baseline.samples].map((s) => s.tick);
  const lastTick = ticks.length === 0 ? 1 : Math.max(...ticks, 1);

  // One shared y-range across both lines, or the divergence is a drawing artifact.
  const low = Math.min(pair.scenario.min, pair.baseline.min);
  const high = Math.max(pair.scenario.max, pair.baseline.max);
  const span = high - low || 1;

  return {
    x: (tick) => pad + (tick / lastTick) * (width - pad * 2),
    y: (value) => height - pad - ((value - low) / span) * (height - pad * 2),
    lastTick,
  };
}

function path(samples: readonly Sample[], scale: Scale, throughTick: number): string {
  let out = '';
  for (const sample of samples) {
    if (sample.tick > throughTick) break;
    out += `${out === '' ? 'M' : 'L'}${scale.x(sample.tick).toFixed(2)} ${scale.y(sample.value).toFixed(2)}`;
  }
  return out;
}

/** Closed shape between the two lines: the area is the size of the difference. */
function band(pair: ChartPair, scale: Scale, throughTick: number): string {
  const top = pair.scenario.samples.filter((s) => s.tick <= throughTick);
  const bottom = pair.baseline.samples.filter((s) => s.tick <= throughTick);
  if (top.length === 0 || bottom.length === 0) return '';
  const forward = top
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${scale.x(s.tick).toFixed(2)} ${scale.y(s.value).toFixed(2)}`)
    .join('');
  const back = [...bottom]
    .reverse()
    .map((s) => `L${scale.x(s.tick).toFixed(2)} ${scale.y(s.value).toFixed(2)}`)
    .join('');
  return `${forward}${back}Z`;
}

function shortLabel(stateKey: string): string {
  return stateKey.replace(/^[A-Z]{3}:/, '');
}

/** Axis ticks. `toPrecision` gives "5.29e+3" for a population, which is useless. */
function axisLabel(value: number): string {
  const size = Math.abs(value);
  if (size >= 10_000) return `${Math.round(value / 1000)}k`;
  if (size >= 100) return Math.round(value).toLocaleString('en-US');
  if (size >= 1) return value.toFixed(1);
  if (size === 0) return '0';
  return value.toFixed(3);
}

export function Sparkline({
  pair,
  throughTick,
  interventionTicks,
  active,
  onSelect,
}: {
  pair: ChartPair;
  throughTick: number;
  interventionTicks: readonly number[];
  active: boolean;
  onSelect: () => void;
}) {
  const width = 200;
  const height = 64;
  const scale = useMemo(() => scaleFor(pair, width, height, 4), [pair]);
  const diverged = pair.scenario.samples.some((sample, index) => {
    const other = pair.baseline.samples[index];
    return other !== undefined && other.exact !== sample.exact;
  });

  return (
    <button
      onClick={onSelect}
      className={`group rounded border p-2 text-left transition-colors ${
        active ? 'border-ink bg-surface' : 'border-rule hover:bg-surface'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-[10px] text-ink-secondary">
          {shortLabel(pair.stateKey)}
        </span>
        {diverged && (
          <span
            aria-label="diverged from baseline"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: 'var(--prov-invented)' }}
          />
        )}
      </span>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 w-full" role="img">
        <path
          d={band(pair, scale, throughTick)}
          fill="var(--prov-invented)"
          opacity={0.16}
        />
        <path
          d={path(pair.baseline.samples, scale, throughTick)}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <path
          d={path(pair.scenario.samples, scale, throughTick)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={1.5}
        />
        {interventionTicks.map((tick) => (
          <line
            key={tick}
            x1={scale.x(tick)}
            x2={scale.x(tick)}
            y1={0}
            y2={height}
            stroke="var(--prov-invented)"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
      </svg>
    </button>
  );
}

export function HeroChart({
  pair,
  throughTick,
  interventionTicks,
}: {
  pair: ChartPair;
  throughTick: number;
  interventionTicks: readonly number[];
}) {
  const width = 960;
  const height = 300;
  const pad = 28;
  const scale = useMemo(() => scaleFor(pair, width, height, pad), [pair]);

  const at = (series: Series) => {
    let found: Sample | undefined;
    for (const sample of series.samples) {
      if (sample.tick > throughTick) break;
      found = sample;
    }
    return found;
  };
  const head = at(pair.scenario);
  const ghost = at(pair.baseline);

  const low = Math.min(pair.scenario.min, pair.baseline.min);
  const high = Math.max(pair.scenario.max, pair.baseline.max);

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = low + (high - low) * (1 - fraction);
          const y = pad + fraction * (height - pad * 2);
          return (
            <g key={fraction}>
              <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text x={4} y={y - 3} fill="var(--ink-muted)" fontSize={9} fontFamily="ui-monospace, monospace">
                {axisLabel(value)}
              </text>
            </g>
          );
        })}

        <path d={band(pair, scale, throughTick)} fill="var(--prov-invented)" opacity={0.18} />
        <path
          d={path(pair.baseline.samples, scale, throughTick)}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1.25}
          strokeDasharray="3 3"
        />
        <path
          d={path(pair.scenario.samples, scale, throughTick)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
        />

        {interventionTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={scale.x(tick)}
              x2={scale.x(tick)}
              y1={pad - 8}
              y2={height - pad}
              stroke="var(--prov-invented)"
              strokeWidth={1}
            />
            <text
              x={scale.x(tick) + 4}
              y={pad - 10}
              fill="var(--prov-invented)"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              intervention · {tick}
            </text>
          </g>
        ))}

        {ghost !== undefined && (
          <circle cx={scale.x(ghost.tick)} cy={scale.y(ghost.value)} r={2.5} fill="var(--ink-muted)" />
        )}
        {head !== undefined && (
          <>
            <line
              x1={scale.x(head.tick)}
              x2={scale.x(head.tick)}
              y1={pad}
              y2={height - pad}
              stroke="var(--rule)"
              strokeWidth={1}
            />
            <circle cx={scale.x(head.tick)} cy={scale.y(head.value)} r={3.5} fill="var(--series-1)" />
          </>
        )}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs">
        <span className="text-ink">{shortLabel(pair.stateKey)}</span>
        <span className="text-ink-secondary">
          tick {throughTick} · scenario {head?.exact ?? '—'}
        </span>
        <span className="text-ink-muted">baseline {ghost?.exact ?? '—'}</span>
      </figcaption>
    </figure>
  );
}
