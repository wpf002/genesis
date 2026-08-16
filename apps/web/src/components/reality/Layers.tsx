'use client';

import { useMemo, useState } from 'react';
import {
  BUTTERFLY_LIMITS,
  CONTINUITY_NOTE,
  EVIDENCE,
  POSSIBILITY_CAVEAT,
  PRESSURES_NOT_MODELLED,
  REPRESENTABILITY,
  formatYear,
  type Butterfly,
  type ButterflyNode,
  type Condition,
  type Continuity,
  type Person,
  type Possibility,
  type Pressure,
} from '@genesis/replay';
import regions from '@/lib/regions.json';

type Geo = Record<string, { name: string; rings: number[][][] }>;
const GEO = regions as Geo;
const name = (code: string) => GEO[code]?.name ?? code;

/** Every number should be able to answer "why". This is the affordance. */
export function WhyLink({
  stateKey,
  region,
  year,
}: {
  stateKey: string | null;
  region?: string | null;
  year?: number | null;
}) {
  if (stateKey === null) return null;
  const query = new URLSearchParams({ key: stateKey });
  if (region !== null && region !== undefined && region !== '') query.set('region', region);
  if (year !== null && year !== undefined) query.set('year', String(year));
  return (
    <a
      href={`/inspector?${query.toString()}`}
      className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted underline decoration-rule underline-offset-2 hover:text-ink"
      title="Trace this value back to the parameters behind it"
    >
      why?
    </a>
  );
}

const STAGE_COLOR: Record<ButterflyNode['stage'], string> = {
  lever: '#d55181',
  direct: '#3987e5',
  'knock-on': '#199e70',
  'cross-region': '#199e70',
  'long-range': '#9085e9',
  'model-limit': '#c98500',
};

const STAGE_LABEL: Record<ButterflyNode['stage'], string> = {
  lever: 'The lever',
  direct: 'Direct effect',
  'knock-on': 'Knock-on',
  'cross-region': 'Reached elsewhere',
  'long-range': 'Long range',
  'model-limit': 'Model behaviour',
};

/** The causal cascade, as a chain you can walk. */
export function ButterflyEffect({ data }: { data: Butterfly }) {
  const [open, setOpen] = useState<string | undefined>();
  const byStage = useMemo(() => {
    const order: ButterflyNode['stage'][] = [
      'lever',
      'direct',
      'knock-on',
      'cross-region',
      'long-range',
      'model-limit',
    ];
    return order
      .map((stage) => ({ stage, nodes: data.nodes.filter((n) => n.stage === stage) }))
      .filter((group) => group.nodes.length > 0);
  }, [data]);

  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Butterfly effect
        <span className="ml-3 normal-case tracking-normal text-ink-muted">
          derived from {data.derivedFrom}
        </span>
      </h3>

      <ol className="mt-4">
        {byStage.map((group, gi) => (
          <li key={group.stage} className="relative pb-5 pl-6">
            <span
              className="absolute left-0 top-1.5 inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: STAGE_COLOR[group.stage] }}
            />
            {gi < byStage.length - 1 && (
              <span
                className="absolute left-[4.5px] top-4 h-full w-px"
                style={{ background: 'var(--rule)' }}
              />
            )}
            <p
              className="font-mono text-[10px] uppercase tracking-[0.1em]"
              style={{ color: STAGE_COLOR[group.stage] }}
            >
              {STAGE_LABEL[group.stage]}
            </p>
            <ul className="mt-1.5">
              {group.nodes.map((node) => (
                <li key={node.id} className="border-b border-rule py-1.5">
                  <button
                    onClick={() => setOpen(open === node.id ? undefined : node.id)}
                    className="flex w-full flex-wrap items-baseline gap-x-3 text-left"
                  >
                    <span className="text-sm text-ink">{node.title}</span>
                    {node.year !== null && (
                      <span className="font-mono text-[10px] tabular-nums text-ink-muted">
                        {formatYear(node.year)}
                      </span>
                    )}
                    {node.region !== null && (
                      <span className="text-[11px] text-ink-muted">{name(node.region)}</span>
                    )}
                    <span
                      className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em]"
                      style={{ color: EVIDENCE[node.evidence].color }}
                    >
                      {EVIDENCE[node.evidence].short}
                    </span>
                  </button>
                  {open === node.id && (
                    <div className="mt-1.5 pl-1">
                      <p className="text-[11px] leading-relaxed text-ink-secondary">
                        {node.detail}
                      </p>
                      <p className="mt-1 flex flex-wrap items-baseline gap-3 font-mono text-[10px] text-ink-muted">
                        {node.stateKey !== null && <span>{node.stateKey}</span>}
                        <WhyLink stateKey={node.stateKey} region={node.region} year={node.year} />
                        {node.parents.length > 0 && (
                          <span>follows from {node.parents.join(', ')}</span>
                        )}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <ul className="mt-2">
        {BUTTERFLY_LIMITS.map((limit) => (
          <li key={limit} className="py-0.5 text-[10px] leading-relaxed text-ink-muted">
            — {limit}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Why this world is moving the way it is. */
export function HistoricalPressures({
  data,
  where,
}: {
  data: readonly Pressure[];
  where: string;
}) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Historical pressures
        <span className="ml-3 normal-case tracking-normal text-ink-muted">{where}</span>
      </h3>
      <ul className="mt-3">
        {data.map((pressure) => {
          const positive = pressure.magnitude >= 0;
          return (
            <li key={pressure.id} className="border-b border-rule py-2">
              <div className="flex items-baseline gap-3">
                <span className="w-32 shrink-0 text-[11px] text-ink-secondary">
                  {pressure.label}
                </span>
                <span className="relative h-2 flex-1 rounded bg-surface">
                  <span className="absolute left-1/2 top-0 h-2 w-px bg-rule" />
                  <span
                    className="absolute top-0 h-2 rounded"
                    style={{
                      background: positive ? '#199e70' : '#d55181',
                      left: positive ? '50%' : `${50 - Math.abs(pressure.magnitude) * 50}%`,
                      width: `${Math.abs(pressure.magnitude) * 50}%`,
                    }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-muted">
                  {pressure.magnitude >= 0 ? '+' : ''}
                  {pressure.magnitude.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 pl-[8.75rem] text-[10px] leading-relaxed text-ink-muted">
                {pressure.reading}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        Not modelled
      </p>
      <ul>
        {PRESSURES_NOT_MODELLED.map((line) => (
          <li key={line} className="py-0.5 text-[10px] leading-relaxed text-ink-muted">
            — {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Everything Genesis knows about one country, and a list of what it does not. */
export function CivilizationState({
  condition,
  baseline,
  pressures: forces,
  year,
  onClose,
}: {
  condition: Condition;
  baseline: Condition | undefined;
  pressures: readonly Pressure[];
  year: number;
  onClose: () => void;
}) {
  const rows: [string, string, string | null, string | null][] = [
    ['Population', Math.round(condition.population).toLocaleString('en-US'), 'demography.population', baseline === undefined ? null : Math.round(baseline.population).toLocaleString('en-US')],
    ['Food per head', condition.foodRatio.toFixed(3), 'demography.foodRatio', baseline?.foodRatio.toFixed(3) ?? null],
    ['Infectious share', `${(condition.infectious * 100).toFixed(2)}%`, 'disease_seird.infectious', baseline === undefined ? null : `${(baseline.infectious * 100).toFixed(2)}%`],
    ['Legitimacy', condition.legitimacy.toFixed(3), 'politics_legitimacy.legitimacy', baseline?.legitimacy.toFixed(3) ?? null],
    ['Condition', condition.state, null, baseline?.state ?? null],
  ];

  return (
    <aside className="rounded border border-rule bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{name(condition.region)}</h3>
        <button onClick={onClose} className="font-mono text-[10px] text-ink-muted hover:text-ink">
          close
        </button>
      </div>
      <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
        {condition.region} · {formatYear(year)}
      </p>

      <table className="mt-3 w-full text-left">
        <thead>
          <tr className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted">
            <th className="py-1">Field</th>
            <th className="py-1">This world</th>
            <th className="py-1">Baseline</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value, key, base]) => (
            <tr key={label} className="border-t border-rule">
              <td className="py-1.5 text-[11px] text-ink-secondary">{label}</td>
              <td className="py-1.5 font-mono text-[11px] text-ink">{value}</td>
              <td className="py-1.5 font-mono text-[11px] text-ink-muted">{base ?? '—'}</td>
              <td className="py-1.5 text-right">
                <WhyLink stateKey={key} region={condition.region} year={year} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        Pressures here
      </p>
      <ul className="mt-1">
        {forces
          .filter((f) => Math.abs(f.magnitude) > 0.05)
          .slice(0, 5)
          .map((f) => (
            <li key={f.id} className="flex items-baseline justify-between gap-2 py-0.5">
              <span className="text-[10px] text-ink-secondary">{f.label}</span>
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: f.magnitude >= 0 ? '#199e70' : '#d55181' }}
              >
                {f.magnitude >= 0 ? '+' : ''}
                {f.magnitude.toFixed(2)}
              </span>
            </li>
          ))}
      </ul>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        Not modelled for this country
      </p>
      <ul>
        {[
          'Government, ruler, capital',
          'Borders and who holds them',
          'Religion, language, identity',
          'Alliances and diplomatic posture',
          'Military order of battle',
        ].map((line) => (
          <li key={line} className="py-0.5 text-[10px] text-ink-muted">
            — {line}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
        Country-specific historical initialisation is not calibrated: every country
        starts from the same invented population.
      </p>
    </aside>
  );
}

/** Narrative possibilities, each labelled by what the engine can do with it. */
export function PossibilityTree({
  items,
  onSimulate,
}: {
  items: readonly Possibility[];
  onSimulate: (possibility: Possibility) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        Possibility tree
        <span className="ml-3 normal-case tracking-normal" style={{ color: EVIDENCE.interpretive.color }}>
          interpretive — not simulation output
        </span>
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{POSSIBILITY_CAVEAT}</p>
      <ol className="mt-3">
        {items.map((possibility) => (
          <li key={possibility.id} className="border-b border-rule py-3">
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="text-sm text-ink">{possibility.title}</span>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.08em]"
                style={{
                  color:
                    possibility.support === 'not-modelled'
                      ? EVIDENCE['not-modelled'].color
                      : '#3987e5',
                }}
              >
                engine: {possibility.support}
              </span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
              {possibility.detail}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              {REPRESENTABILITY[possibility.support]}
            </p>
            {possibility.approximation !== undefined && (
              <>
                <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
                  {possibility.approximation.caveat}
                </p>
                <button
                  onClick={() => onSimulate(possibility)}
                  className="mt-2 rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors hover:bg-surface"
                  style={{ borderColor: '#3987e5', color: '#3987e5' }}
                >
                  Simulate approximation →
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** People, kept firmly outside the model. */
export function KeyPeople({
  people,
  continuityLevel,
}: {
  people: readonly Person[];
  continuityLevel: Continuity;
}) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-ink">
        People
        <span className="ml-3 normal-case tracking-normal" style={{ color: EVIDENCE.interpretive.color }}>
          historical and interpretive — Genesis models no individuals
        </span>
      </h3>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-secondary">
        Person continuity: {continuityLevel}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        {CONTINUITY_NOTE[continuityLevel]}
      </p>

      {people.length === 0 ? (
        <p className="mt-3 text-[11px] text-ink-muted">
          Nobody attached to this scenario.
        </p>
      ) : (
        <ol className="mt-3">
          {people.map((person) => (
            <li key={person.name} className="border-b border-rule py-3">
              <p className="flex flex-wrap items-baseline gap-3">
                <span className="text-sm text-ink">{person.name}</span>
                <span className="font-mono text-[10px] text-ink-muted">{person.lived}</span>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.08em]"
                  style={{ color: EVIDENCE['actual-history'].color }}
                >
                  {EVIDENCE['actual-history'].short}
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{person.known}</p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.08em]"
                  style={{ color: EVIDENCE.interpretive.color }}
                >
                  {EVIDENCE.interpretive.short}
                </span>
                <span className="text-[11px] leading-relaxed text-ink-muted">
                  {person.alternate}
                </span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
