import { FlowField } from '@/components/FlowField';
import { PROVENANCE_ORDER, ProvenanceCard } from '@/components/ProvenanceTag';

// Copy on this page comes from README.md and ROADMAP.md. Do not paraphrase them
// here — if the wording needs to change, change it there and copy it across.
// Nothing on this page is simulation output.

const PHASES = [
  { n: 0, name: 'Repo and bootstrap', gate: 'pnpm install && pnpm build && pnpm test passes on a clean clone. CI green.', done: true },
  { n: 1, name: 'Deterministic kernel', gate: '1000 runs at the same seed produce byte-identical terminal state hashes.', done: true },
  { n: 2, name: 'Parameter registry and provenance gate', gate: 'A Rigor run containing one INVENTED parameter anywhere in its output path is refused, with a report naming the parameter and the full path.', done: true },
  { n: 3, name: 'Rigor Track: identifiability first', gate: 'At least one parameter must be found non-identifiable and handled.', done: true },
  { n: 4, name: 'Rigor Track: calibration and validation', gate: 'The model card reports at least one honest failure.', done: true },
  { n: 5, name: 'Sandbox Track: subsystem expansion', gate: 'Full 18-subsystem run, 5000 simulated years, reproducible from seed, no float in state.', done: true },
  { n: 6, name: 'Interface and the provenance inspector', gate: 'Any state value at any tick can be traced to its contributing factors in ≤3 clicks.', done: false },
  { n: 7, name: 'Counterfactual engine', gate: 'A Rigor counterfactual produces an interval and refuses to produce a narrative claim.', done: false },
  { n: 8, name: 'Scenario packs and publishing', gate: 'A third party can reproduce a published run from the permalink alone and get an identical state hash.', done: false },
  { n: 9, name: 'Deploy and harden', gate: 'Live, monitored, cost-capped.', done: false },
] as const;

export default function Home() {
  return (
    <main>
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
          <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-5xl">
            A civilization simulation engine with two operating modes and one
            enforced boundary between them.
          </h1>
          <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-ink-secondary">
            <span className="text-ink">Rigor mode</span> runs a small, calibrated model
            against historical data and reports posteriors, not stories.{' '}
            <span className="text-ink">Sandbox mode</span> runs a large, uncalibrated
            model that is fun to watch and makes no scientific claim. The same kernel
            drives both. The difference is enforced in code, not in documentation.
          </p>
          <p className="mt-8 max-w-2xl border-l-2 border-rule pl-4 text-sm leading-relaxed text-ink-muted">
            Rigor mode refuses to emit any output whose dependency path touches an
            INVENTED parameter. Not a warning — the run is blocked and the gate report
            names the offending parameter and the path.
          </p>
          <a
            href="/inspector"
            className="mt-10 inline-flex items-center gap-2 rounded border border-rule px-4 py-2 font-mono text-xs tracking-[0.08em] text-ink transition-colors hover:bg-surface"
          >
            Open the provenance inspector →
          </a>
          <a
            href="/diff"
            className="ml-3 mt-10 inline-flex items-center gap-2 rounded border border-rule px-4 py-2 font-mono text-xs tracking-[0.08em] text-ink transition-colors hover:bg-surface"
          >
            Run diff →
          </a>
          <p className="label mt-16">This is wallpaper.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
          The core invariant
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Every numeric parameter in Genesis carries a provenance tag.
        </p>

        <p className="mt-6 max-w-2xl border-l-2 pl-4 text-sm leading-relaxed text-ink-secondary" style={{ borderColor: 'var(--prov-invented)' }}>
          Rigor mode has no model. Both parameters failed. The model cards say why.
        </p>

        <div className="mt-8 grid gap-px overflow-hidden rounded border border-rule bg-rule sm:grid-cols-3">
          {PROVENANCE_ORDER.map((tag) => (
            <ProvenanceCard key={tag} tag={tag} />
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          The kernel tracks which parameters contributed to which state change. Every
          state delta emits a <code className="font-mono text-ink">Factor[]</code>{' '}
          record naming its inputs and their provenance.
        </p>
      </section>

      <section className="border-y border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Scope</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Population–yield–climate coupling. Two regions: Nile Valley (primary) and
            Yellow River (holdout). Window: 500 BCE – 1500 CE. Target: ~12 free
            parameters. If the count exceeds 15, cut scope.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
            That was the plan. The data didn&rsquo;t support it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
          Nine phases. Each phase has an exit gate.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          A gate is a binary condition, not a vibe. The kernel and the provenance
          system come before any domain modeling.
        </p>

        <ol className="mt-8">
          {PHASES.map((p) => (
            <li
              key={p.n}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-rule py-4 sm:grid-cols-[2.5rem_20rem_1fr]"
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

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded border border-rule bg-surface p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
            What Genesis does not do
          </h2>
          <ul className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-ink-secondary">
            <li>
              It does not produce probabilities for counterfactuals in Rigor mode. There
              is no reference class for &ldquo;probability the Industrial Revolution
              happens before 1800.&rdquo; Rigor counterfactuals report
              parameter-uncertainty intervals over simulated quantities and nothing else.
            </li>
            <li>
              It does not simulate all of history. Rigor mode covers a deliberately
              narrow mechanism over a deliberately narrow window where data exists.
            </li>
            <li>
              It does not claim Sandbox output means anything. Sandbox is a toy with good
              physics-flavored bones.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
