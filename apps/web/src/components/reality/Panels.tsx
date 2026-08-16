'use client';

import { useState } from 'react';
import { WhyLink } from './Layers';
import {
  DISTANCE_METHOD,
  DNA_NOT_MODELLED,
  EVIDENCE,
  FIT_CAVEAT,
  formatYear,
  SOURCES,
  weightTable,
  type DistancePoint,
  type EvidenceClass,
  type FitPoint,
  type Ripple,
} from '@genesis/replay';

export function EvidenceTag({ kind }: { kind: EvidenceClass }) {
  const style = EVIDENCE[kind];
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-[0.08em]"
      style={{ color: style.color }}
      title={style.meaning}
    >
      {style.short}
    </span>
  );
}

/** Reality Distance over time, with its own arithmetic one click away. */
export function DistanceChart({
  series,
  divergenceTick,
  currentTick,
  onSeek,
}: {
  series: readonly DistancePoint[];
  divergenceTick: number;
  currentTick: number;
  onSeek: (tick: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const W = 960;
  const H = 150;
  const PAD = 34;

  if (series.length === 0) return null;
  const first = series[0]?.tick ?? 0;
  const last = series[series.length - 1]?.tick ?? 1;
  const peak = Math.max(0.001, ...series.map((p) => p.distance));

  const x = (tick: number) => PAD + ((tick - first) / Math.max(1, last - first)) * (W - PAD * 2);
  const y = (value: number) => H - PAD - (value / peak) * (H - PAD * 1.6);

  const line = series.map((p) => `${x(p.tick).toFixed(1)},${y(p.distance).toFixed(1)}`).join('L');
  const now = series.reduce((best, p) => (p.tick <= currentTick ? p : best), series[0] as DistancePoint);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
          Reality distance
          <span className="ml-3 text-ink-muted">a Genesis model index, not a measurement</span>
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-secondary underline decoration-rule underline-offset-4 hover:text-ink"
        >
          How this is calculated
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full cursor-crosshair"
        role="img"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const px = ((event.clientX - box.left) / box.width) * W;
          onSeek(Math.round(first + ((px - PAD) / (W - PAD * 2)) * (last - first)));
        }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD} x2={W - PAD} y1={y(peak * f)} y2={y(peak * f)} stroke="var(--grid)" />
            <text x={4} y={y(peak * f) - 3} fill="var(--ink-muted)" fontSize={9} fontFamily="ui-monospace, monospace">
              {(peak * f).toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={x(divergenceTick)} x2={x(divergenceTick)} y1={10} y2={H - PAD} stroke="#d55181" strokeWidth={1.5} />
        <path d={`M${line}`} fill="none" stroke="#3987e5" strokeWidth={2} />
        <line x1={x(currentTick)} x2={x(currentTick)} y1={10} y2={H - PAD} stroke="var(--ink)" opacity={0.5} />
        <circle cx={x(now.tick)} cy={y(now.distance)} r={3.5} fill="#3987e5" />
      </svg>

      <p className="font-mono text-xs text-ink">
        {formatYear(now.year)} · distance {now.distance.toFixed(3)}
        <span className="ml-3 text-ink-muted">
          peak {peak.toFixed(3)}
        </span>
      </p>

      {open && (
        <div className="mt-3 rounded border border-rule bg-surface p-4">
          <p className="text-sm text-ink">{DISTANCE_METHOD.summary}</p>
          <p className="mt-2 font-mono text-xs text-ink-secondary">{DISTANCE_METHOD.formula}</p>
          <ul className="mt-3">
            {DISTANCE_METHOD.caveats.map((line) => (
              <li key={line} className="border-t border-rule py-2 text-xs leading-relaxed text-ink-muted">
                {line}
              </li>
            ))}
          </ul>
          <p className="label mt-4">Weights — every one INVENTED and registered</p>
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {weightTable().map((row) => (
              <li
                key={row.dimension}
                className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5 font-mono text-[11px]"
              >
                <span className="truncate text-ink-secondary">{row.dimension}</span>
                <span className="tabular-nums text-ink">{row.weight.toFixed(2)}</span>
                <EvidenceTag kind="not-modelled" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Two worlds' structural shape on one set of axes. */
export function RealityDnaChart({
  labels,
  baseline,
  alternate,
  year,
}: {
  labels: readonly string[];
  baseline: readonly number[];
  alternate: readonly number[];
  year: number;
}) {
  const size = 320;
  const c = size / 2;
  const r = c - 46;
  const n = labels.length;

  const point = (i: number, value: number) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const radius = r * Math.max(0.04, Math.min(1, value));
    return [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  };
  const poly = (values: readonly number[]) =>
    values.map((v, i) => point(i, v).map((n2) => n2.toFixed(1)).join(',')).join(' ');

  return (
    <figure>
      <figcaption className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Reality DNA <span className="ml-2 text-ink-muted">{formatYear(year)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${size} ${size}`} className="mt-2 w-full max-w-sm" role="img">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={c} cy={c} r={r * f} fill="none" stroke="var(--grid)" />
        ))}
        {labels.map((label, i) => {
          const [px, py] = point(i, 1.16);
          return (
            <text
              key={label}
              x={px}
              y={py}
              textAnchor="middle"
              fill="var(--ink-muted)"
              fontSize={7.5}
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          );
        })}
        <polygon points={poly(baseline)} fill="var(--ink-muted)" fillOpacity={0.16} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 2" />
        <polygon points={poly(alternate)} fill="#3987e5" fillOpacity={0.2} stroke="#3987e5" strokeWidth={1.75} />
      </svg>
      <p className="mt-1 flex flex-wrap items-baseline gap-3 font-mono text-[10px] text-ink-muted">
        <span>every axis is a real Genesis state variable</span>
        <WhyLink stateKey="demography.population" year={year} />
      </p>
      <ul className="mt-2">
        {DNA_NOT_MODELLED.map((line) => (
          <li key={line} className="py-0.5 text-[10px] leading-relaxed text-ink-muted">
            — {line}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Propagation outward from the divergence. */
export function RippleMap({ data }: { data: Ripple }) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Ripple
        <span className="ml-3 normal-case tracking-normal text-ink-muted">{data.fidelity}</span>
      </h3>
      {data.fidelity === 'aggregated difference trace' && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          The factor ledger is off at world scale, so this is built from state
          differences rather than a true causal trace. Run a single region in the
          Inspector for the full chain.
        </p>
      )}
      <ol className="mt-3">
        {data.rings.map((ring) => (
          <li key={ring.ring} className="border-t border-rule py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-secondary">
              Ring {ring.ring} · {ring.title}
            </p>
            {ring.entries.length === 0 ? (
              <p className="mt-1 text-[11px] text-ink-muted">nothing</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {ring.entries.map((entry) => (
                  <li key={entry.label} className="font-mono text-[11px] text-ink">
                    {entry.label}
                    <span className="ml-1.5 text-ink-muted">{entry.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The third layer: what actually happened, against what the model produces. */
export function ModelAgainstRecord({ fit }: { fit: readonly FitPoint[] }) {
  const W = 620;
  const H = 200;
  const PAD = 40;
  if (fit.length === 0) return null;

  const years = fit.map((p) => p.year);
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  const top = Math.max(
    ...fit.map((p) => Math.max(p.observedHighIndex, p.baselineIndex, p.alternateIndex ?? 0)),
  );

  const x = (year: number) => PAD + ((year - lo) / Math.max(1, hi - lo)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / Math.max(0.001, top)) * (H - PAD * 1.5);

  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Model against record
      </h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img">
        {/* Observation uncertainty band */}
        <path
          d={`M${fit.map((p) => `${x(p.year).toFixed(1)},${y(p.observedHighIndex).toFixed(1)}`).join('L')}L${[...fit].reverse().map((p) => `${x(p.year).toFixed(1)},${y(p.observedLowIndex).toFixed(1)}`).join('L')}Z`}
          fill="#e8e6df"
          fillOpacity={0.12}
        />
        <path
          d={`M${fit.map((p) => `${x(p.year).toFixed(1)},${y(p.observedIndex).toFixed(1)}`).join('L')}`}
          fill="none"
          stroke="#e8e6df"
          strokeWidth={2}
        />
        <path
          d={`M${fit.map((p) => `${x(p.year).toFixed(1)},${y(p.baselineIndex).toFixed(1)}`).join('L')}`}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1.75}
          strokeDasharray="4 3"
        />
        {fit.some((p) => p.alternateIndex !== null) && (
          <path
            d={`M${fit.filter((p) => p.alternateIndex !== null).map((p) => `${x(p.year).toFixed(1)},${y(p.alternateIndex as number).toFixed(1)}`).join('L')}`}
            fill="none"
            stroke="#3987e5"
            strokeWidth={1.75}
          />
        )}
        {fit.map((p) => (
          <circle key={p.year} cx={x(p.year)} cy={y(p.observedIndex)} r={2.5} fill="#e8e6df" />
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px]">
        <span style={{ color: '#e8e6df' }}>— historical record</span>
        <span className="text-ink-muted">- - baseline model</span>
        <span style={{ color: '#3987e5' }}>— counterfactual model</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{FIT_CAVEAT}</p>
      <ul className="mt-2">
        {SOURCES.map((source) => (
          <li key={source.id} className="py-0.5 text-[10px] leading-relaxed text-ink-muted">
            {source.cite} — {source.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
