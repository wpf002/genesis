import { FlowField } from '@/components/FlowField';
import { PROVENANCE_ORDER, ProvenanceCard } from '@/components/ProvenanceTag';

// Nothing here is simulation output. The scope figures are targets from
// ROADMAP.md and are labelled as targets.

const SCOPE = [
  { value: '12', unit: 'free parameters', sub: 'Over 15, cut scope.' },
  { value: '2', unit: 'regions', sub: 'Yellow River held out.' },
  { value: '2,000', unit: 'year window', sub: '500 BCE – 1500 CE.' },
  { value: '18', unit: 'sandbox subsystems', sub: 'Timeboxed.' },
] as const;

const PHASES = [
  { n: 0, name: 'Repo and bootstrap', gate: 'Clean clone builds and tests green in CI.', done: true },
  { n: 1, name: 'Deterministic kernel', gate: '1000 seeded replays byte-match.', done: false },
  { n: 2, name: 'Parameter registry and provenance gate', gate: 'One INVENTED ancestor refuses the run.', done: false },
  { n: 3, name: 'Identifiability first', gate: 'At least one parameter found non-identifiable.', done: false },
  { n: 4, name: 'Calibration and validation', gate: 'The model card reports an honest failure.', done: false },
  { n: 5, name: 'Sandbox subsystems', gate: '5000 years, reproducible, no float in state.', done: false },
  { n: 6, name: 'Interface and provenance inspector', gate: 'Any value traced to its factors in 3 clicks.', done: false },
  { n: 7, name: 'Counterfactual engine', gate: 'Rigor returns an interval, not a narrative.', done: false },
  { n: 8, name: 'Scenario packs and publishing', gate: 'A run reproduces from its permalink alone.', done: false },
  { n: 9, name: 'Deploy and harden', gate: 'Live, monitored, cost-capped.', done: false },
] as const;

export default function Home() {
  return (
    <main>
      {/* ---- Hero ------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden border-b border-rule">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-plane" />
        <FlowField className="absolute inset-0 -z-10 size-full" />
        <div aria-hidden="true" className="graticule absolute inset-0 -z-10" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_58%_86%_at_12%_52%,var(--plane)_38%,transparent_78%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-plane via-transparent to-plane"
        />

        <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <p className="label">Civilization simulation engine</p>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-6xl">
            Two operating modes and one enforced boundary between them.
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink-secondary">
            <span className="text-ink">Rigor mode</span> runs a small, calibrated model
            against historical data and reports posteriors, not stories.{' '}
            <span className="text-ink">Sandbox mode</span> runs a large, uncalibrated
            model that is fun to watch and makes no scientific claim. The same kernel
            drives both. The difference is enforced in code, not in documentation.
          </p>
          <p className="mt-7 max-w-2xl border-l-2 border-rule pl-4 text-sm leading-relaxed text-ink-muted">
            Rigor mode refuses to emit any output whose dependency path touches an
            INVENTED parameter. The run is blocked and the gate report names the
            parameter and the path.
          </p>

          <p className="label mt-16">
            ↑ Decorative field. Seeded, reproducible, not simulation output.
          </p>
        </div>
      </section>

      {/* ---- Provenance -------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-3 border-b border-rule pb-6">
          <p className="label">The core invariant</p>
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
            Every numeric parameter carries a provenance tag
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Provenance is a required field. There is no default. The kernel tracks which
            parameters contributed to which state change, so the tag stays attached to
            the number all the way to the screen.
          </p>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-3">
          {PROVENANCE_ORDER.map((tag) => (
            <ProvenanceCard key={tag} tag={tag} />
          ))}
        </div>
      </section>

      {/* ---- Scope ------------------------------------------------------- */}
      <section className="border-y border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="label">Rigor scope — target, not result</p>
          <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SCOPE.map((s) => (
              <div key={s.unit} className="flex flex-col gap-1.5">
                <dt className="text-4xl font-semibold tracking-[-0.02em] text-ink">
                  {s.value}
                </dt>
                <dd className="label">{s.unit}</dd>
                <dd className="text-xs text-ink-muted">{s.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- Phases ------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-3 border-b border-rule pb-6">
          <p className="label">Build order</p>
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
            Nine phases, each with a binary exit gate
          </h2>
        </div>

        <ol className="mt-2">
          {PHASES.map((p) => (
            <li
              key={p.n}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-rule py-4 sm:grid-cols-[2.5rem_18rem_1fr]"
            >
              <span
                className="font-mono text-xs tracking-[0.08em]"
                style={{ color: p.done ? 'var(--prov-calibrated)' : 'var(--ink-muted)' }}
              >
                {p.done ? '◆' : '○'} {p.n}
              </span>
              <span className={p.done ? 'text-sm text-ink' : 'text-sm text-ink-secondary'}>
                {p.name}
              </span>
              <span className="col-start-2 text-xs leading-relaxed text-ink-muted sm:col-start-3">
                {p.gate}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Limits ------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded border border-rule bg-surface p-8">
          <p className="label">What Genesis does not do</p>
          <ul className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-ink-secondary">
            <li className="border-l-2 pl-4" style={{ borderColor: 'var(--prov-invented)' }}>
              It does not produce probabilities for counterfactuals in Rigor mode. Rigor
              counterfactuals report parameter-uncertainty intervals over simulated
              quantities and nothing else.
            </li>
            <li className="border-l-2 pl-4" style={{ borderColor: 'var(--prov-estimated)' }}>
              It does not simulate all of history. Rigor mode covers a narrow mechanism
              over a narrow window where data exists.
            </li>
            <li className="border-l-2 pl-4" style={{ borderColor: 'var(--prov-calibrated)' }}>
              It does not claim Sandbox output means anything. Sandbox is watermarked
              everywhere it can leave the system.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
