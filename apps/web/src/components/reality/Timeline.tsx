'use client';

import { useMemo, useState } from 'react';
import {
  EVIDENCE,
  formatYear,
  type ButterflyNode,
  type CascadeEvent,
  type EvidenceClass,
  type FirstDifference,
} from '@genesis/replay';
import { WhyLink } from './Layers';
import regions from '@/lib/regions.json';

type Geo = Record<string, { name: string }>;
const GEO = regions as Geo;
const name = (code: string | null) =>
  code === null || code === '' ? '—' : (GEO[code]?.name ?? code);

// The scrubber, with the eras written on it.
//
// A bare 0..N slider over five thousand years tells you nothing about where you
// are. These are conventional anchors, not model output — they exist so a reader
// can find the fourteenth century without counting.

const ERAS: readonly { year: number; label: string }[] = [
  { year: -3000, label: '3000 BC' },
  { year: -2000, label: '2000 BC' },
  { year: -1000, label: '1000 BC' },
  { year: 1, label: 'AD 1' },
  { year: 500, label: '500' },
  { year: 1000, label: '1000' },
  { year: 1500, label: '1500' },
  { year: 1800, label: '1800' },
  { year: 2026, label: '2026' },
  { year: 2100, label: '2100' },
];

export function TimeScrubber({
  firstTick,
  lastTick,
  currentTick,
  divergenceTick,
  cascades,
  onSeek,
}: {
  firstTick: number;
  lastTick: number;
  currentTick: number;
  divergenceTick: number;
  cascades: readonly CascadeEvent[];
  onSeek: (tick: number) => void;
}) {
  const span = Math.max(1, lastTick - firstTick);
  const pct = (tick: number) => ((tick - firstTick) / span) * 100;

  return (
    <div className="select-none">
      <div
        className="relative h-8 cursor-crosshair"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const fraction = (event.clientX - box.left) / box.width;
          onSeek(Math.round(firstTick + fraction * span));
        }}
      >
        <span className="absolute left-0 right-0 top-3 h-px bg-rule" />

        {ERAS.filter((era) => era.year + 3000 >= firstTick && era.year + 3000 <= lastTick).map(
          (era) => (
            <span key={era.year} className="absolute top-0" style={{ left: `${pct(era.year + 3000)}%` }}>
              <span className="block h-6 w-px bg-rule" />
              <span className="absolute left-1 top-6 whitespace-nowrap font-mono text-[9px] text-ink-muted">
                {era.label}
              </span>
            </span>
          ),
        )}

        {/* Projection band: past here nothing checks the model. */}
        {lastTick > 5025 && (
          <span
            className="absolute top-2 h-2"
            style={{
              left: `${pct(5025)}%`,
              width: `${100 - pct(5025)}%`,
              background: 'repeating-linear-gradient(-45deg, #9085e955 0 2px, transparent 2px 5px)',
            }}
          />
        )}

        <span
          className="absolute top-0 h-6 w-px"
          style={{ left: `${pct(divergenceTick)}%`, background: '#d55181' }}
        />
        {cascades.map((cascade) => (
          <span
            key={cascade.tick}
            className="absolute top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ left: `${pct(cascade.tick)}%`, background: '#c98500' }}
            title={`Cascade ${formatYear(cascade.year)} — ${cascade.drivers.join(', ')}`}
          />
        ))}

        <span
          className="absolute top-0 h-6 w-0.5 -translate-x-1/2"
          style={{ left: `${pct(currentTick)}%`, background: 'var(--ink)' }}
        />
      </div>
      <p className="mt-4 font-mono text-[9px] text-ink-muted">
        Era marks are conventional anchors, not model output. The hatched band is
        projection.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export type TimelineNode =
  | { kind: 'divergence'; year: number }
  | { kind: 'cascade'; event: CascadeEvent }
  | { kind: 'first-difference'; difference: FirstDifference }
  | { kind: 'effect'; node: ButterflyNode };

export interface NodeContext {
  readonly scenarioTitle: string;
  readonly premise: string;
  readonly reading: string;
  readonly archetype: string;
  readonly changedParams: readonly string[];
  readonly touched: readonly string[];
  readonly baselineHash: string;
  readonly terminalHash: string;
  readonly limits: readonly string[];
}

interface Row {
  readonly label: string;
  readonly value: string;
  readonly evidence?: EvidenceClass;
}

/**
 * Everything about one point on the timeline.
 *
 * Only the fields that apply to this node are rendered. A cascade has no lever
 * and a divergence has no baseline value, so neither gets an empty row — an
 * empty row reads as "we do not know", which is a different claim from "this
 * does not apply here".
 */
export function NodeDetail({
  node,
  context,
  onClose,
}: {
  node: TimelineNode;
  context: NodeContext;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'source' | 'model' | 'interpretation'>('model');

  const { title, year, type, rows, stateKey, region } = useMemo(() => {
    if (node.kind === 'divergence') {
      return {
        title: 'Point of divergence',
        year: node.year,
        type: 'Intervention' as const,
        stateKey: null as string | null,
        region: null as string | null,
        rows: [
          { label: 'Premise', value: context.premise, evidence: 'interpretive' as EvidenceClass },
          { label: 'Engine lever', value: context.reading, evidence: 'not-modelled' as EvidenceClass },
          { label: 'Structural archetype', value: context.archetype },
          { label: 'Parameters changed', value: context.changedParams.join(', ') || 'none' },
          { label: 'Provenance', value: 'INVENTED — an override is invented by definition' },
          { label: 'Applied to', value: `${context.touched.length} countries` },
          { label: 'Before this year', value: 'byte-identical to the baseline, by construction' },
        ] as Row[],
      };
    }
    if (node.kind === 'cascade') {
      return {
        title: 'Cascade',
        year: node.event.year,
        type: 'Model-detected' as const,
        stateKey: null as string | null,
        region: null as string | null,
        rows: [
          {
            label: 'What happened',
            value: `Reality Distance moved ${node.event.acceleration.toFixed(1)}× its usual rate here.`,
            evidence: 'simulated' as EvidenceClass,
          },
          { label: 'Distance at this point', value: node.event.distance.toFixed(4) },
          { label: 'Driven by', value: node.event.drivers.join(', ') },
          {
            label: 'How it was found',
            value: 'From the distance series, not from a list of famous years.',
          },
        ] as Row[],
      };
    }
    if (node.kind === 'first-difference') {
      const d = node.difference;
      const delta = d.alternate - d.baseline;
      return {
        title: 'First difference',
        year: d.year,
        type: 'Simulated' as const,
        stateKey: d.key,
        region: d.region,
        rows: [
          { label: 'Variable', value: d.label, evidence: 'simulated' as EvidenceClass },
          { label: 'Subsystem', value: d.subsystem },
          { label: 'Where', value: name(d.region) },
          { label: 'Baseline value', value: d.baseline.toPrecision(8) },
          { label: 'Counterfactual value', value: d.alternate.toPrecision(8) },
          {
            label: 'Delta',
            value: `${delta >= 0 ? '+' : ''}${delta.toPrecision(6)}`,
          },
          {
            label: 'Why this is attributable',
            value:
              'Pre-divergence state is byte-identical and the RNG substreams carry across the branch, so this is the intervention rather than drift.',
          },
        ] as Row[],
      };
    }
    const n = node.node;
    return {
      title: n.title,
      year: n.year ?? 0,
      type: (n.stage === 'direct'
        ? 'Simulated'
        : n.stage === 'model-limit'
          ? 'Model behaviour'
          : 'Knock-on') as string,
      stateKey: n.stateKey,
      region: n.region,
      rows: [
        { label: 'What happened', value: n.detail, evidence: n.evidence },
        { label: 'Subsystem', value: n.stateKey?.split('.')[0] ?? '—' },
        { label: 'Where it first shows', value: name(n.region) },
        { label: 'Follows from', value: n.parents.join(', ') || 'the lever' },
      ] as Row[],
    };
  }, [node, context]);

  return (
    <aside className="rounded border border-rule bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
            {formatYear(year)} · {type}
          </p>
        </div>
        <button onClick={onClose} className="font-mono text-[10px] text-ink-muted hover:text-ink">
          close
        </button>
      </div>

      {/* Source / Model / Interpretation. Three questions about one claim. */}
      <div className="mt-3 flex gap-1">
        {(['source', 'model', 'interpretation'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
              id === tab ? 'border-ink text-ink' : 'border-rule text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === 'model' && (
        <>
          <dl className="mt-3">
            {rows.map((row) => (
              <div key={row.label} className="border-t border-rule py-2">
                <dt className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-ink-muted">{row.label}</span>
                  {row.evidence !== undefined && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.08em]"
                      style={{ color: EVIDENCE[row.evidence].color }}
                    >
                      {EVIDENCE[row.evidence].short}
                    </span>
                  )}
                </dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 flex flex-wrap items-baseline gap-3 font-mono text-[10px] text-ink-muted">
            {stateKey !== null && <span>{stateKey}</span>}
            <WhyLink stateKey={stateKey} region={region} year={year} />
          </p>
          <dl className="mt-3">
            {[
              ['Baseline hash', context.baselineHash.slice(0, 16)],
              ['Counterfactual hash', context.terminalHash.slice(0, 16)],
            ].map(([label, value]) => (
              <div key={label} className="border-t border-rule py-1.5">
                <dt className="text-[10px] text-ink-muted">{label}</dt>
                <dd className="break-all font-mono text-[10px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {tab === 'source' && (
        <div className="mt-3">
          <p className="text-[11px] leading-relaxed text-ink-secondary">
            Genesis computed this. It is not a historical record and it has no citation
            — the record layer is separate, and lives in the Actual history mode.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            The scenario premise, “{context.premise}”, is a human counterfactual. The
            engine simulated the lever, not the premise.
          </p>
        </div>
      )}

      {tab === 'interpretation' && (
        <div className="mt-3">
          <p className="text-[11px] leading-relaxed text-ink-secondary">
            What this might mean is a reading, and the engine has no opinion about it.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
            Model limitations that bear on it
          </p>
          <ul className="mt-1">
            {context.limits.map((limit) => (
              <li key={limit} className="py-1 text-[10px] leading-relaxed text-ink-muted">
                — {limit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
